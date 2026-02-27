<?php

declare(strict_types=1);

namespace App\Modules\Attendance\Services;

use App\Models\User;
use App\Modules\Attendance\Models\AttendanceLog;
use App\Modules\Audit\Services\AuditWriterService;
use App\Modules\Branches\Models\Branch;
use App\Modules\Employees\Models\Employee;
use App\Modules\Shifts\Models\Shift;
use App\Modules\Settings\Services\SystemSettingsService;
use Illuminate\Database\DatabaseManager;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;
use Throwable;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AttendanceService
{
    public function __construct(
        private readonly DatabaseManager $db,
        private readonly GeoFenceValidationService $geoFence,
        private readonly SystemSettingsService $systemSettings,
        private readonly AuditWriterService $auditWriter,
    ) {
    }

    public function checkIn(User $user, float $latitude, float $longitude): AttendanceLog
    {
        $employee = Employee::query()
            ->where('user_id', $user->id)
            ->first();

        if (!$employee) {
            throw new HttpException(403, 'Employee profile is required.');
        }

        $branchId = $employee->branch_id ? (int) $employee->branch_id : null;
        if (!$branchId) {
            $branchId = (int) Branch::query()->orderBy('id')->value('id');
        }

        if (!$branchId) {
            throw new HttpException(422, 'No branch is configured for shift resolution.');
        }

        $headOffice = $this->systemSettings->getHeadOfficeGeoFence();

        $within = $this->geoFence->isWithinRadiusMeters(
            (float) ($headOffice['latitude'] ?? 0),
            (float) ($headOffice['longitude'] ?? 0),
            $latitude,
            $longitude,
            (int) ($headOffice['radius_meters'] ?? 0),
        );

        if (!$within) {
            throw new HttpException(403, 'You are outside the Head Office geo-fence. Please move closer and try again.');
        }

        $now = now();
        $logDate = $now->toDateString();

        $existing = AttendanceLog::query()
            ->where('user_id', $user->id)
            ->where('log_date', $logDate)
            ->whereNull('check_out_time')
            ->first();

        if ($existing) {
            throw new HttpException(409, 'You are already checked in for today.');
        }

        $shift = $this->resolveShiftForBranch($branchId);
        $lateMinutes = $this->calculateLateMinutes($now, $shift);

        $employeeId = (int) $employee->id;

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

    public function checkOut(User $user): AttendanceLog
    {
        $now = now();
        $logDate = $now->toDateString();

        $active = AttendanceLog::query()
            ->where('user_id', $user->id)
            ->where('log_date', $logDate)
            ->whereNull('check_out_time')
            ->first();

        if (!$active) {
            throw new HttpException(409, 'No active check-in found.');
        }

        if ($active->check_in_time && $now->lessThan($active->check_in_time)) {
            throw new HttpException(409, 'Invalid check-out time.');
        }

        $shift = $this->resolveShiftForBranch((int) $active->branch_id);
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

        return $query->paginate($perPage);
    }

    public function manageIndex(
        ?string $from,
        ?string $to,
        ?string $status,
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

            try {
                $shift = $this->resolveShiftForBranch((int) $log->branch_id);
                $log->late_minutes = $this->calculateLateMinutesForDate($log->check_in_time, $log->log_date, $shift);
                $log->overtime_minutes = $this->calculateOvertimeMinutesForDate($log->check_out_time, $log->log_date, $shift);
            } catch (Throwable $e) {
                if ($e instanceof HttpException && $e->getStatusCode() === 422) {
                    $log->late_minutes = 0;
                    $log->overtime_minutes = 0;
                } else {
                    throw $e;
                }
            }

            $log->status = $log->check_out_time ? 'checked_out' : 'checked_in';

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

    private function calculateLateMinutesForDate(?Carbon $checkInAt, $logDate, Shift $shift): int
    {
        if (!$checkInAt) {
            return 0;
        }

        $date = $logDate instanceof Carbon ? $logDate->copy() : Carbon::parse((string) $logDate);
        $start = $date->copy()->startOfDay()->setTimeFromTimeString($shift->start_time);
        $lateFrom = $start->copy()->addMinutes((int) $shift->grace_minutes);

        if ($checkInAt->lessThanOrEqualTo($lateFrom)) {
            return 0;
        }

        return (int) $lateFrom->diffInMinutes($checkInAt);
    }

    private function calculateOvertimeMinutesForDate(?Carbon $checkOutAt, $logDate, Shift $shift): int
    {
        if (!$checkOutAt) {
            return 0;
        }

        $date = $logDate instanceof Carbon ? $logDate->copy() : Carbon::parse((string) $logDate);
        $end = $date->copy()->startOfDay()->setTimeFromTimeString($shift->end_time);
        $overtimeFrom = $end->copy()->addMinutes((int) $shift->overtime_threshold);

        if ($checkOutAt->lessThanOrEqualTo($overtimeFrom)) {
            return 0;
        }

        return (int) $overtimeFrom->diffInMinutes($checkOutAt);
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
