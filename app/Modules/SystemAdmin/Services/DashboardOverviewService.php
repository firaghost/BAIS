<?php

declare(strict_types=1);

namespace App\Modules\SystemAdmin\Services;

use App\Modules\Audit\Models\AuditLog;
use App\Modules\Auth\Models\Device;
use App\Modules\Branches\Models\Branch;
use App\Modules\Employees\Models\Employee;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class DashboardOverviewService
{
    public function getOverview(int $days = 7): array
    {
        $now = CarbonImmutable::now();
        $days = in_array($days, [7, 30], true) ? $days : 7;
        $from = $now->subDays($days - 1)->startOfDay();

        $branchesCount = Branch::query()->count();
        $employeesCount = Employee::query()->count();
        $activeSessions = Device::query()->where('is_active', true)->count();

        $urgentSuspiciousLogins = AuditLog::query()
            ->where('action', 'device.login_rejected')
            ->where('created_at', '>=', $now->subDay())
            ->count();

        $deviceSyncPending = 0;

        $recentLogs = AuditLog::query()
            ->orderByDesc('created_at')
            ->limit(5)
            ->get();

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
            'recent_logs' => $recentLogs,
        ];
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
