<?php

declare(strict_types=1);

namespace App\Modules\Attendance\Services;

use App\Models\User;
use App\Modules\Attendance\Models\AttendanceLog;
use App\Modules\Audit\Services\AuditWriterService;
use App\Modules\Branches\Models\Branch;
use App\Modules\Employees\Models\Employee;
use App\Modules\Shifts\Models\Shift;
use Illuminate\Database\DatabaseManager;
use Illuminate\Pagination\LengthAwarePaginator;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AttendanceService
{
    public function __construct(
        private readonly DatabaseManager $db,
        private readonly GeoFenceValidationService $geoFence,
        private readonly AuditWriterService $auditWriter,
    ) {
    }

    public function checkIn(User $user, int $branchId, float $latitude, float $longitude): AttendanceLog
    {
        $branch = Branch::query()->findOrFail($branchId);

        $within = $this->geoFence->isWithinRadiusMeters(
            (float) $branch->latitude,
            (float) $branch->longitude,
            $latitude,
            $longitude,
            (int) $branch->radius_meters,
        );

        if (!$within) {
            throw new HttpException(403, 'Outside branch geofence.');
        }

        $now = now();
        $logDate = $now->toDateString();

        $existing = AttendanceLog::query()
            ->where('user_id', $user->id)
            ->where('log_date', $logDate)
            ->whereNull('check_out_time')
            ->first();

        if ($existing) {
            throw new HttpException(409, 'Duplicate check-in.');
        }

        $shift = $this->resolveShiftForBranch($branchId);
        $lateMinutes = $this->calculateLateMinutes($now, $shift);

        $employeeId = Employee::query()
            ->where('user_id', $user->id)
            ->value('id');

        return $this->db->transaction(function () use ($user, $employeeId, $branchId, $logDate, $now, $lateMinutes): AttendanceLog {
            return AttendanceLog::query()->create([
                'user_id' => $user->id,
                'employee_id' => $employeeId,
                'branch_id' => $branchId,
                'log_date' => $logDate,
                'check_in_time' => $now,
                'check_out_time' => null,
                'late_minutes' => $lateMinutes,
                'overtime_minutes' => 0,
                'status' => 'checked_in',
            ]);
        });
    }

    public function checkOut(User $user, int $branchId): AttendanceLog
    {
        $now = now();
        $logDate = $now->toDateString();

        $active = AttendanceLog::query()
            ->where('user_id', $user->id)
            ->where('branch_id', $branchId)
            ->where('log_date', $logDate)
            ->whereNull('check_out_time')
            ->first();

        if (!$active) {
            throw new HttpException(409, 'No active check-in found.');
        }

        if ($active->check_in_time && $now->lessThan($active->check_in_time)) {
            throw new HttpException(409, 'Invalid check-out time.');
        }

        $shift = $this->resolveShiftForBranch($branchId);
        $overtimeMinutes = $this->calculateOvertimeMinutes($now, $shift);

        return $this->db->transaction(function () use ($active, $now, $overtimeMinutes): AttendanceLog {
            $active->check_out_time = $now;
            $active->overtime_minutes = $overtimeMinutes;
            $active->status = 'checked_out';
            $active->save();

            return $active;
        });
    }

    public function history(
        User $user,
        ?string $from,
        ?string $to,
        ?string $status,
        ?int $branchId,
        int $perPage,
    ): LengthAwarePaginator {
        $query = AttendanceLog::query()
            ->where('user_id', $user->id)
            ->orderByDesc('log_date')
            ->orderByDesc('check_in_time');

        if ($from) {
            $query->whereDate('log_date', '>=', $from);
        }

        if ($to) {
            $query->whereDate('log_date', '<=', $to);
        }

        if ($status) {
            $query->where('status', $status);
        }

        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        return $query->paginate($perPage);
    }

    public function manageIndex(
        ?string $from,
        ?string $to,
        ?string $status,
        ?int $branchId,
        ?int $userId,
        ?int $employeeId,
        int $perPage,
    ): LengthAwarePaginator {
        $query = AttendanceLog::query()
            ->with(['user', 'employee', 'branch'])
            ->orderByDesc('log_date')
            ->orderByDesc('check_in_time');

        if ($from) {
            $query->whereDate('log_date', '>=', $from);
        }

        if ($to) {
            $query->whereDate('log_date', '<=', $to);
        }

        if ($status) {
            $query->where('status', $status);
        }

        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        if ($userId) {
            $query->where('user_id', $userId);
        }

        if ($employeeId) {
            $query->where('employee_id', $employeeId);
        }

        return $query->paginate($perPage);
    }

    public function manageUpdate(User $actor, AttendanceLog $log, array $data, string $reason, ?string $ipAddress): AttendanceLog
    {
        return $this->db->transaction(function () use ($actor, $log, $data, $reason, $ipAddress): AttendanceLog {
            $old = $log->toArray();

            $log->fill($data);

            if ($log->check_in_time && $log->check_out_time && $log->check_out_time->lessThan($log->check_in_time)) {
                throw new HttpException(422, 'Invalid check-out time.');
            }

            $log->save();

            $new = $log->toArray();
            $new['reason'] = $reason;

            $this->auditWriter->log(
                $actor->id,
                'attendance.admin_updated',
                AttendanceLog::class,
                $log->id,
                $old,
                $new,
                $ipAddress,
            );

            return $log;
        });
    }

    private function resolveShiftForBranch(int $branchId): Shift
    {
        $shift = Shift::query()
            ->where('branch_id', $branchId)
            ->orderBy('start_time')
            ->first();

        if (!$shift) {
            throw new HttpException(422, 'No shift configured for this branch.');
        }

        return $shift;
    }

    private function calculateLateMinutes(\Illuminate\Support\Carbon $now, Shift $shift): int
    {
        $start = $this->todayTime($shift->start_time);
        $grace = (int) $shift->grace_minutes;
        $lateFrom = $start->copy()->addMinutes($grace);

        if ($now->lessThanOrEqualTo($lateFrom)) {
            return 0;
        }

        return (int) $lateFrom->diffInMinutes($now);
    }

    private function calculateOvertimeMinutes(\Illuminate\Support\Carbon $now, Shift $shift): int
    {
        $end = $this->todayTime($shift->end_time);
        $threshold = (int) $shift->overtime_threshold;
        $overtimeFrom = $end->copy()->addMinutes($threshold);

        if ($now->lessThanOrEqualTo($overtimeFrom)) {
            return 0;
        }

        return (int) $overtimeFrom->diffInMinutes($now);
    }

    private function todayTime(string $time): \Illuminate\Support\Carbon
    {
        return now()->startOfDay()->setTimeFromTimeString($time);
    }
}
