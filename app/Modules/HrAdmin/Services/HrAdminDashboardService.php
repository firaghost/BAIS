<?php

declare(strict_types=1);

namespace App\Modules\HrAdmin\Services;

use App\Modules\Attendance\Models\AttendanceLog;
use App\Modules\Audit\Services\AuditWriterService;
use App\Modules\Employees\Models\Employee;
use App\Modules\Leaves\Models\LeaveRequest;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class HrAdminDashboardService
{
    public function __construct(private readonly AuditWriterService $auditWriter)
    {
    }

    public function getNavMeta(): array
    {
        $pending = (int) LeaveRequest::query()
            ->where('status', 'pending_hr')
            ->count();

        return [
            'pending_leave_requests' => $pending,
        ];
    }

    public function sendWarning(int $actorUserId, int $employeeId, ?string $ipAddress): void
    {
        $employee = Employee::query()->where('id', $employeeId)->first();

        if (!$employee) {
            throw new \Symfony\Component\HttpKernel\Exception\HttpException(404, 'Employee not found.');
        }

        $this->auditWriter->log(
            $actorUserId,
            'hr.warning.sent',
            Employee::class,
            $employeeId,
            null,
            [
                'employee_id' => $employeeId,
                'employee_code' => $employee->employee_code,
                'department' => $employee->department,
            ],
            $ipAddress,
        );
    }

    public function getOverview(int $actorUserId, ?int $branchId, ?string $month): array
    {
        $now = CarbonImmutable::now();
        $today = $now->toDateString();

        $monthStart = $this->parseMonthStart($month, $now);
        $monthEnd = $monthStart->endOfMonth();

        $employeesQuery = Employee::query()->where('status', 'active');
        if ($branchId) {
            $employeesQuery->where('branch_id', $branchId);
        }

        $activeEmployees = (int) $employeesQuery->count();

        $presentToday = $this->presentCountForDate($today, $branchId);
        $presentYesterday = $this->presentCountForDate($now->subDay()->toDateString(), $branchId);

        $lateToday = $this->lateArrivalsCountForDate($today, $branchId);
        $lateYesterday = $this->lateArrivalsCountForDate($now->subDay()->toDateString(), $branchId);

        $onLeaveToday = $this->onLeaveCountForDate($today, $branchId);

        $absentToday = max(0, $activeEmployees - $presentToday - $onLeaveToday);
        $absentYesterday = max(0, $activeEmployees - $presentYesterday - $this->onLeaveCountForDate($now->subDay()->toDateString(), $branchId));

        $pendingLeaveRequests = $this->pendingLeaveRequests($branchId);
        $lateAttention = $this->chronicLateArrivals($monthStart, $monthEnd, $branchId);

        return [
            'timestamp' => $now->toIso8601String(),
            'branch_scope' => $branchId,
            'kpis' => [
                'active_employees' => $activeEmployees,
                'present_today' => $presentToday,
                'present_today_percent' => $activeEmployees > 0 ? round(($presentToday / $activeEmployees) * 100) : 0,
                'present_trend_percent' => $this->trendPercent($presentYesterday, $presentToday),
                'late_arrivals' => $lateToday,
                'late_trend_percent' => $this->trendPercent($lateYesterday, $lateToday),
                'absent' => $absentToday,
                'absent_trend_percent' => $this->trendPercent($absentYesterday, $absentToday),
                'on_leave' => $onLeaveToday,
            ],
            'heatmap' => $this->monthlyAttendanceHeatmap($monthStart, $monthEnd, $branchId, $activeEmployees),
            'pending_leave_requests' => [
                'count' => (int) LeaveRequest::query()->where('status', 'pending_hr')->count(),
                'items' => $pendingLeaveRequests,
            ],
            'late_attention' => $lateAttention,
        ];
    }

    private function parseMonthStart(?string $month, CarbonImmutable $fallbackNow): CarbonImmutable
    {
        if (is_string($month) && preg_match('/^\d{4}-\d{2}$/', $month) === 1) {
            return CarbonImmutable::createFromFormat('Y-m', $month)->startOfMonth();
        }

        return $fallbackNow->startOfMonth();
    }

    private function presentCountForDate(string $date, ?int $branchId): int
    {
        return (int) AttendanceLog::query()
            ->whereDate('log_date', $date)
            ->when($branchId, fn ($q) => $q->where('attendance_logs.branch_id', $branchId))
            ->selectRaw('COUNT(DISTINCT COALESCE(employee_id, user_id)) as c')
            ->value('c');
    }

    private function lateArrivalsCountForDate(string $date, ?int $branchId): int
    {
        return (int) AttendanceLog::query()
            ->whereDate('log_date', $date)
            ->when($branchId, fn ($q) => $q->where('attendance_logs.branch_id', $branchId))
            ->where('late_minutes', '>', 0)
            ->count();
    }

    private function onLeaveCountForDate(string $date, ?int $branchId): int
    {
        return (int) LeaveRequest::query()
            ->join('employees', 'employees.id', '=', 'leave_requests.employee_id')
            ->where('leave_requests.status', 'approved')
            ->whereDate('leave_requests.start_date', '<=', $date)
            ->whereDate('leave_requests.end_date', '>=', $date)
            ->when($branchId, fn ($q) => $q->where('employees.branch_id', $branchId))
            ->selectRaw('COUNT(DISTINCT leave_requests.employee_id) as c')
            ->value('c');
    }

    private function monthlyAttendanceHeatmap(CarbonImmutable $from, CarbonImmutable $to, ?int $branchId, int $activeEmployees): array
    {
        $avgCheckIn = AttendanceLog::query()
            ->whereDate('log_date', '>=', $from->toDateString())
            ->whereDate('log_date', '<=', $to->toDateString())
            ->when($branchId, fn ($q) => $q->where('attendance_logs.branch_id', $branchId))
            ->selectRaw('SEC_TO_TIME(AVG(TIME_TO_SEC(check_in_time))) as t')
            ->value('t');

        $avgCheckInLabel = null;
        if (is_string($avgCheckIn) && trim($avgCheckIn) !== '') {
            try {
                $avgCheckInLabel = CarbonImmutable::createFromFormat('H:i:s', trim($avgCheckIn))
                    ->format('h:i A');
            } catch (\Throwable) {
                $avgCheckInLabel = null;
            }
        }

        $rows = AttendanceLog::query()
            ->selectRaw('log_date as d, COUNT(DISTINCT COALESCE(employee_id, user_id)) as c')
            ->whereDate('log_date', '>=', $from->toDateString())
            ->whereDate('log_date', '<=', $to->toDateString())
            ->when($branchId, fn ($q) => $q->where('attendance_logs.branch_id', $branchId))
            ->groupBy('log_date')
            ->orderBy('log_date')
            ->get();

        $map = [];
        foreach ($rows as $r) {
            $map[(string) $r->d] = (int) $r->c;
        }

        $days = [];
        for ($d = $from; $d <= $to; $d = $d->addDay()) {
            $key = $d->toDateString();
            $count = $map[$key] ?? 0;
            $pct = $activeEmployees > 0 ? (int) round(($count / $activeEmployees) * 100) : 0;
            $days[] = [
                'date' => $key,
                'day' => (int) $d->day,
                'weekday' => $d->dayOfWeekIso,
                'attendance_percent' => $pct,
            ];
        }

        return [
            'month' => $from->format('Y-m'),
            'label' => $from->format('F Y'),
            'avg_check_in_time' => $avgCheckInLabel,
            'days' => $days,
        ];
    }

    private function pendingLeaveRequests(?int $branchId): array
    {
        $q = LeaveRequest::query()
            ->with(['user', 'employee'])
            ->where('status', 'pending_hr')
            ->orderByDesc('created_at')
            ->limit(5);

        if ($branchId) {
            $q->whereHas('employee', fn ($e) => $e->where('branch_id', $branchId));
        }

        return $q->get()->map(function (LeaveRequest $r): array {
            $name = $r->employee ? trim(($r->employee->first_name ?? '') . ' ' . ($r->employee->last_name ?? '')) : ($r->user->name ?? '—');

            return [
                'id' => $r->id,
                'employee_name' => $name !== '' ? $name : '—',
                'department' => $r->employee->department ?? null,
                'leave_type' => $r->leave_type,
                'start_date' => $r->start_date->toDateString(),
                'end_date' => $r->end_date->toDateString(),
                'status' => $r->status,
            ];
        })->values()->all();
    }

    private function chronicLateArrivals(CarbonImmutable $from, CarbonImmutable $to, ?int $branchId): array
    {
        $q = AttendanceLog::query()
            ->join('employees', 'employees.id', '=', 'attendance_logs.employee_id')
            ->leftJoin('users', 'users.id', '=', 'employees.user_id')
            ->whereDate('attendance_logs.log_date', '>=', $from->toDateString())
            ->whereDate('attendance_logs.log_date', '<=', $to->toDateString())
            ->where('attendance_logs.late_minutes', '>', 0)
            ->when($branchId, fn ($x) => $x->where('attendance_logs.branch_id', $branchId))
            ->groupBy('attendance_logs.employee_id', 'employees.first_name', 'employees.last_name', 'employees.department', DB::raw('users.name'))
            ->havingRaw('COUNT(*) >= 3')
            ->orderByRaw('COUNT(*) DESC')
            ->limit(5)
            ->select([
                'attendance_logs.employee_id as employee_id',
                DB::raw('COUNT(*) as late_count'),
                DB::raw('ROUND(AVG(attendance_logs.late_minutes)) as avg_late_minutes'),
                'employees.first_name as first_name',
                'employees.last_name as last_name',
                'employees.department as department',
                DB::raw('users.name as user_name'),
            ]);

        $rows = $q->get();

        return $rows->map(function ($r): array {
            $name = trim(((string) ($r->first_name ?? '') . ' ' . (string) ($r->last_name ?? '')));
            if ($name === '') {
                $name = (string) ($r->user_name ?? '—');
            }

            return [
                'employee_id' => (int) $r->employee_id,
                'employee_name' => $name !== '' ? $name : '—',
                'department' => $r->department ? (string) $r->department : null,
                'late_count' => (int) $r->late_count,
                'avg_late_minutes' => (int) $r->avg_late_minutes,
            ];
        })->values()->all();
    }

    private function trendPercent(int $prev, int $cur): float
    {
        if ($prev === 0) {
            return $cur > 0 ? 100.0 : 0.0;
        }

        return round((($cur - $prev) / $prev) * 100, 1);
    }
}
