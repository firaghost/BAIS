<?php

declare(strict_types=1);

namespace App\Modules\SystemAdmin\Services;

use App\Modules\Audit\Models\AuditLog;
use App\Modules\Auth\Models\Device;
use App\Modules\Branches\Models\Branch;
use App\Modules\Employees\Models\Employee;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class DashboardOverviewService
{
    public function getOverview(int $days = 7, ?int $branchId = null, int $page = 1, int $perPage = 5): array
    {
        $now = CarbonImmutable::now();
        $days = in_array($days, [7, 30], true) ? $days : 7;
        $from = $now->subDays($days - 1)->startOfDay();

        $branchesCount = Branch::query()->count();
        $employeesQuery = Employee::query();

        if ($branchId) {
            $employeesQuery->where('branch_id', $branchId);
        }

        $employeesCount = $employeesQuery->count();

        $activeSessionsQuery = Device::query()->where('is_active', true);

        if ($branchId) {
            $activeSessionsQuery
                ->join('employees', 'employees.id', '=', 'devices.employee_id')
                ->where('employees.branch_id', $branchId);
        }

        $activeSessions = (int) $activeSessionsQuery->count();

        $urgentSuspiciousLogins = AuditLog::query()
            ->where('action', 'device.login_rejected')
            ->where('created_at', '>=', $now->subDay())
            ->count();

        $deviceSyncPending = 0;

        $recentLogs = $this->paginateRecentLogs($page, $perPage);

        $series = $this->buildDailySeries($from, $now, 'device.login_rejected');

        return [
            'timestamp' => $now->toIso8601String(),
            'kpis' => [
                'total_branches' => $branchesCount,
                'total_employees' => $employeesCount,
                'active_sessions' => $activeSessions,
                'compliance_score' => null,
            ],
            'system_status' => [
                'status' => 'ok',
            ],
            'urgent_actions' => [
                'suspicious_logins_24h' => $urgentSuspiciousLogins,
                'device_sync_pending' => $deviceSyncPending,
            ],
            'charts' => [
                'geo_validation_failures' => [
                    'days' => $days,
                    'labels' => $series['labels'],
                    'values' => $series['values'],
                ],
            ],
            'branch_scope' => $branchId,
            'recent_logs' => [
                'data' => $recentLogs->items(),
                'meta' => [
                    'page' => $recentLogs->currentPage(),
                    'per_page' => $recentLogs->perPage(),
                    'total' => $recentLogs->total(),
                    'last_page' => $recentLogs->lastPage(),
                    'has_prev' => $recentLogs->currentPage() > 1,
                    'has_next' => $recentLogs->currentPage() < $recentLogs->lastPage(),
                ],
            ],
        ];
    }

    private function paginateRecentLogs(int $page, int $perPage): LengthAwarePaginator
    {
        $page = $page > 0 ? $page : 1;
        $perPage = $perPage > 0 && $perPage <= 50 ? $perPage : 5;

        return AuditLog::query()
            ->leftJoin('users', 'users.id', '=', 'audit_logs.user_id')
            ->select([
                'audit_logs.id',
                'audit_logs.user_id',
                'audit_logs.action',
                'audit_logs.model_type',
                'audit_logs.model_id',
                'audit_logs.ip_address',
                'audit_logs.created_at',
                DB::raw('users.name as actor_name'),
            ])
            ->orderByDesc('audit_logs.created_at')
            ->paginate($perPage, ['*'], 'page', $page);
    }

    private function buildDailySeries(CarbonImmutable $from, CarbonImmutable $to, string $action): array
    {
        $rows = AuditLog::query()
            ->selectRaw('DATE(created_at) as d, COUNT(*) as c')
            ->where('action', $action)
            ->where('created_at', '>=', $from)
            ->where('created_at', '<=', $to)
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('d')
            ->get();

        $map = [];

        foreach ($rows as $row) {
            $map[(string) $row->d] = (int) $row->c;
        }

        $labels = [];
        $values = [];

        for ($d = $from; $d <= $to; $d = $d->addDay()) {
            $key = $d->toDateString();
            $labels[] = $d->format('D');
            $values[] = $map[$key] ?? 0;
        }

        return ['labels' => $labels, 'values' => $values];
    }
}
