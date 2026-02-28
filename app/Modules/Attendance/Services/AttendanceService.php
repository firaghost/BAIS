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
    private const CHECK_IN_EARLY_MINUTES = 30;
    private const CHECK_IN_LATE_MINUTES  = 30;
    private const GEOFENCE_CACHE_TTL     = 300; // 5 minutes in seconds
    private const GEOFENCE_CACHE_KEY     = 'bais.head_office_geo_fence';

    public function __construct(
        private readonly DatabaseManager $db,
        private readonly GeoFenceValidationService $geoFence,
        private readonly SystemSettingsService $systemSettings,
        private readonly AuditWriterService $auditWriter,
    ) {
    }

    // -------------------------------------------------------------------------
    //  Check-In
    // -------------------------------------------------------------------------

    private function isDevMode(): bool
    {
        return app()->environment('local') || (bool) config('app.debug');
    }

    public function checkIn(User $user, float $latitude, float $longitude): AttendanceLog
    {
        $employee = Employee::query()
            ->where('user_id', $user->id)
            ->first();

        if (! $employee) {
            throw new HttpException(403, 'Employee profile is required to check in.');
        }

        // Resolve branch: prefer employee's branch, fall back to first branch
        $branchId = $employee->branch_id ? (int) $employee->branch_id : null;
        if (! $branchId) {
            $branchId = (int) Branch::query()->orderBy('id')->value('id');
        }

        if (! $branchId) {
            throw new HttpException(422, 'No branch is configured for shift resolution.');
        }

        if (! $this->isDevMode()) {
            // Geofence validation — cached to avoid a DB/settings hit on every request
            $headOffice = cache()->remember(
                self::GEOFENCE_CACHE_KEY,
                self::GEOFENCE_CACHE_TTL,
                fn () => $this->systemSettings->getHeadOfficeGeoFence()
            );

            $within = $this->geoFence->isWithinRadiusMeters(
                (float) ($headOffice['latitude']      ?? 0),
                (float) ($headOffice['longitude']     ?? 0),
                $latitude,
                $longitude,
                (int)   ($headOffice['radius_meters'] ?? 0),
            );

            if (! $within) {
                throw new HttpException(403, 'You are outside the Head Office geo-fence. Please move closer and try again.');
            }
        }

        $now        = now();
        $logDate    = $now->toDateString();
        $employeeId = (int) $employee->id;

        // Shift validation happens OUTSIDE the transaction so we don't hold the
        // lock longer than necessary.
        $shift = $this->resolveShiftForBranch($branchId);
        if (! $this->isDevMode()) {
            $this->assertWithinWorkingHours($now, $shift);
        }
        $lateMinutes = $this->calculateLateMinutes($now, $shift);

        // Use DB transaction + lockForUpdate to prevent duplicate check-ins
        // under 1000+ concurrent users hitting this endpoint simultaneously.
        return $this->db->transaction(function () use ($user, $employeeId, $branchId, $logDate, $now, $lateMinutes): AttendanceLog {

            if (! $this->isDevMode()) {
                // Prevent check-in if already checked out today
                $alreadyCheckedOut = AttendanceLog::query()
                    ->where('user_id', $user->id)
                    ->where('log_date', $logDate)
                    ->whereNotNull('check_out_time')
                    ->lockForUpdate()
                    ->exists();

                if ($alreadyCheckedOut) {
                    throw new HttpException(409, 'You have already checked out for today.');
                }
            }

            // Idempotency: return existing record for in-flight network retries
            $existing = AttendanceLog::query()
                ->where('user_id', $user->id)
                ->where('log_date', $logDate)
                ->whereNull('check_out_time')
                ->lockForUpdate()
                ->first();

            if ($existing) {
                return $existing;
            }

            return AttendanceLog::query()->create([
                'user_id'          => $user->id,
                'employee_id'      => $employeeId,
                'branch_id'        => $branchId,
                'log_date'         => $logDate,
                'check_in_time'    => $now,
                'check_out_time'   => null,
                'late_minutes'     => $lateMinutes,
                'overtime_minutes' => 0,
                'status'           => 'checked_in',
            ]);
        });
    }

    // -------------------------------------------------------------------------
    //  Check-Out
    // -------------------------------------------------------------------------

    public function checkOut(User $user): AttendanceLog
    {
        $now     = now();
        $logDate = $now->toDateString();

        return $this->db->transaction(function () use ($user, $now, $logDate): AttendanceLog {

            // Lock the active check-in row to prevent concurrent checkouts
            $active = AttendanceLog::query()
                ->where('user_id', $user->id)
                ->where('log_date', $logDate)
                ->whereNull('check_out_time')
                ->lockForUpdate()
                ->first();

            if (! $active) {
                // Idempotency: if already checked out, return the completed record
                $completed = AttendanceLog::query()
                    ->where('user_id', $user->id)
                    ->where('log_date', $logDate)
                    ->whereNotNull('check_out_time')
                    ->orderByDesc('check_out_time')
                    ->first();

                if ($completed) {
                    return $completed;
                }

                throw new HttpException(409, 'No active check-in found for today.');
            }

            if ($active->check_in_time && $now->lessThan($active->check_in_time)) {
                throw new HttpException(422, 'Check-out time cannot be before check-in time.');
            }

            $shift           = $this->resolveShiftForBranch((int) $active->branch_id);
            $overtimeMinutes = $this->calculateOvertimeMinutes($now, $shift);

            $active->check_out_time   = $now;
            $active->overtime_minutes = $overtimeMinutes;
            $active->status           = 'checked_out';
            $active->save();

            return $active;
        });
    }

    // -------------------------------------------------------------------------
    //  History
    // -------------------------------------------------------------------------

    public function history(
        User $user,
        ?string $from,
        ?string $to,
        ?string $status,
        int $perPage,
    ): LengthAwarePaginator {
        $query = AttendanceLog::query()
            ->with(['branch', 'employee'])
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

    // -------------------------------------------------------------------------
    //  Weekly Summary
    // -------------------------------------------------------------------------

    public function weeklySummary(User $user): array
    {
        $start = Carbon::now()->startOfWeek(Carbon::MONDAY)->startOfDay();
        $end   = Carbon::now()->endOfWeek(Carbon::SUNDAY)->endOfDay();

        $logs = AttendanceLog::query()
            ->where('user_id', $user->id)
            ->whereBetween('log_date', [$start->toDateString(), $end->toDateString()])
            ->get(['log_date', 'check_in_time', 'check_out_time']);

        $workedSeconds = 0;
        $daysPresent   = [];

        foreach ($logs as $log) {
            if ($log->check_in_time) {
                $daysPresent[$log->log_date->toDateString()] = true;
            }

            if ($log->check_in_time && $log->check_out_time) {
                $diff = $log->check_in_time->diffInSeconds($log->check_out_time, false);
                if ($diff > 0) {
                    $workedSeconds += $diff;
                }
            }
        }

        $workingDaysTotal = 0;
        $cursor = $start->copy()->startOfDay();
        while ($cursor->lessThanOrEqualTo($end)) {
            if (! $cursor->isSaturday() && ! $cursor->isSunday()) {
                $workingDaysTotal++;
            }
            $cursor->addDay();
        }

        return [
            'week_start'     => $start->toDateString(),
            'week_end'       => $end->toDateString(),
            'worked_seconds' => $workedSeconds,
            'worked_hours'   => round($workedSeconds / 3600, 1),
            'days_present'   => count($daysPresent),
            'days_total'     => $workingDaysTotal,
        ];
    }

    // -------------------------------------------------------------------------
    //  Admin: Manage
    // -------------------------------------------------------------------------

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

        if ($from)       { $query->whereDate('log_date', '>=', $from); }
        if ($to)         { $query->whereDate('log_date', '<=', $to); }
        if ($status)     { $query->where('status', $status); }
        if ($userId)     { $query->where('user_id', $userId); }
        if ($employeeId) { $query->where('employee_id', $employeeId); }

        return $query->paginate($perPage);
    }

    public function manageUpdate(
        User $actor,
        AttendanceLog $log,
        array $data,
        string $reason,
        ?string $ipAddress,
    ): AttendanceLog {
        return $this->db->transaction(function () use ($actor, $log, $data, $reason, $ipAddress): AttendanceLog {
            $old = $log->toArray();

            $log->fill($data);

            if ($log->check_in_time && $log->check_out_time && $log->check_out_time->lessThan($log->check_in_time)) {
                throw new HttpException(422, 'Check-out time cannot be before check-in time.');
            }

            try {
                $shift = $this->resolveShiftForBranch((int) $log->branch_id);
                $log->late_minutes     = $this->calculateLateMinutesForDate($log->check_in_time, $log->log_date, $shift);
                $log->overtime_minutes = $this->calculateOvertimeMinutesForDate($log->check_out_time, $log->log_date, $shift);
            } catch (Throwable $e) {
                if ($e instanceof HttpException && $e->getStatusCode() === 422) {
                    $log->late_minutes     = 0;
                    $log->overtime_minutes = 0;
                } else {
                    throw $e;
                }
            }

            $log->status = $log->check_out_time ? 'checked_out' : 'checked_in';
            $log->save();

            $new           = $log->toArray();
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

    // -------------------------------------------------------------------------
    //  Private Helpers
    // -------------------------------------------------------------------------

    private function resolveShiftForBranch(int $branchId): Shift
    {
        $shift = Shift::query()
            ->where('branch_id', $branchId)
            ->orderBy('start_time')
            ->first();

        if (! $shift) {
            throw new HttpException(422, 'No shift is configured for this branch.');
        }

        return $shift;
    }

    private function assertWithinWorkingHours(Carbon $now, Shift $shift): void
    {
        $start = $now->copy()->startOfDay()->setTimeFromTimeString($shift->start_time);
        $end   = $now->copy()->startOfDay()->setTimeFromTimeString($shift->end_time);

        // Handle overnight shifts (e.g. 22:00 – 06:00)
        if ($end->lessThan($start)) {
            $end->addDay();
        }

        $earliest = $start->copy()->subMinutes(self::CHECK_IN_EARLY_MINUTES);
        $latest   = $end->copy()->addMinutes(self::CHECK_IN_LATE_MINUTES);

        if ($now->lessThan($earliest) || $now->greaterThan($latest)) {
            throw new HttpException(403, 'Check-in is only allowed during working hours.');
        }
    }

    private function calculateLateMinutes(Carbon $now, Shift $shift): int
    {
        $start    = $now->copy()->startOfDay()->setTimeFromTimeString($shift->start_time);
        $lateFrom = $start->copy()->addMinutes((int) $shift->grace_minutes);

        if ($now->lessThanOrEqualTo($lateFrom)) {
            return 0;
        }

        return (int) $lateFrom->diffInMinutes($now);
    }

    private function calculateOvertimeMinutes(Carbon $now, Shift $shift): int
    {
        $end         = $now->copy()->startOfDay()->setTimeFromTimeString($shift->end_time);
        $overtimeFrom = $end->copy()->addMinutes((int) $shift->overtime_threshold);

        if ($now->lessThanOrEqualTo($overtimeFrom)) {
            return 0;
        }

        return (int) $overtimeFrom->diffInMinutes($now);
    }

    private function calculateLateMinutesForDate(?Carbon $checkInAt, mixed $logDate, Shift $shift): int
    {
        if (! $checkInAt) {
            return 0;
        }

        $date     = $logDate instanceof Carbon ? $logDate->copy() : Carbon::parse((string) $logDate);
        $start    = $date->copy()->startOfDay()->setTimeFromTimeString($shift->start_time);
        $lateFrom = $start->copy()->addMinutes((int) $shift->grace_minutes);

        if ($checkInAt->lessThanOrEqualTo($lateFrom)) {
            return 0;
        }

        return (int) $lateFrom->diffInMinutes($checkInAt);
    }

    private function calculateOvertimeMinutesForDate(?Carbon $checkOutAt, mixed $logDate, Shift $shift): int
    {
        if (! $checkOutAt) {
            return 0;
        }

        $date         = $logDate instanceof Carbon ? $logDate->copy() : Carbon::parse((string) $logDate);
        $end          = $date->copy()->startOfDay()->setTimeFromTimeString($shift->end_time);
        $overtimeFrom = $end->copy()->addMinutes((int) $shift->overtime_threshold);

        if ($checkOutAt->lessThanOrEqualTo($overtimeFrom)) {
            return 0;
        }

        return (int) $overtimeFrom->diffInMinutes($checkOutAt);
    }
}
