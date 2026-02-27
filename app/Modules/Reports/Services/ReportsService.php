<?php

declare(strict_types=1);

namespace App\Modules\Reports\Services;

use App\Models\User;
use App\Modules\Attendance\Models\AttendanceLog;
use App\Modules\Audit\Services\AuditWriterService;
use App\Modules\Auth\Models\Device;
use App\Modules\Branches\Models\Branch;
use App\Modules\Employees\Models\Employee;
use App\Modules\Reports\Models\ReportRun;
use App\Modules\Reports\Models\ReportTemplate;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Database\DatabaseManager;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ReportsService
{
    private const SHIFT_START = '08:00:00';
    private const SHIFT_END = '17:00:00';
    private const BREAK_START = '12:00:00';
    private const BREAK_END = '13:00:00';
    private const REGULAR_DAY_MINUTES = 8 * 60;
    private const HALF_DAY_MINUTES = 4 * 60;

    public function __construct(
        private readonly DatabaseManager $db,
        private readonly AuditWriterService $auditWriter,
        private readonly ReportXlsxExporter $xlsxExporter,
    ) {
    }

    public function deleteRun(User $actor, ReportRun $run, ?string $ipAddress): void
    {
        $before = $run->toArray();

        $this->db->transaction(function () use ($run): void {
            $run->delete();
        });

        $this->auditWriter->log(
            $actor->id,
            'report.deleted',
            ReportRun::class,
            $run->id,
            $before,
            null,
            $ipAddress,
        );
    }

    public function deleteRunById(User $actor, int $runId, ?string $ipAddress): void
    {
        $run = ReportRun::query()->find($runId);
        if (!$run) {
            return;
        }

        $this->deleteRun($actor, $run, $ipAddress);
    }

    public function overview(): array
    {
        $now = now();
        $monthStart = $now->copy()->startOfMonth()->toDateString();
        $today = $now->toDateString();

        $workdays = $this->countWorkdaysExcludingSunday($monthStart, $today);
        $employees = (int) Employee::query()->count();

        $presentRows = (int) AttendanceLog::query()
            ->whereDate('log_date', '>=', $monthStart)
            ->whereDate('log_date', '<=', $today)
            ->selectRaw('COUNT(DISTINCT CONCAT(employee_id, "-", log_date)) as c')
            ->value('c');

        $expected = $employees > 0 ? $employees * $workdays : 0;
        $compliance = $expected > 0 ? round(($presentRows / $expected) * 100, 1) : 0.0;

        $topBranch = $this->topPerformingBranch($monthStart, $today, $workdays);

        $totalDevices = (int) Device::query()->count();
        $activeDevices = (int) Device::query()->where('is_active', true)->count();
        $offline = max(0, $totalDevices - $activeDevices);
        $deviceHealth = $totalDevices > 0 ? round(($activeDevices / $totalDevices) * 100, 1) : 0.0;

        $runsThisWeek = (int) ReportRun::query()
            ->where('created_at', '>=', $now->copy()->subDays(7))
            ->count();

        return [
            'monthly_compliance_avg' => $compliance,
            'top_branch' => $topBranch,
            'device_health' => [
                'percent' => $deviceHealth,
                'offline' => $offline,
            ],
            'reports_generated' => [
                'count' => $runsThisWeek,
            ],
        ];
    }

    public function templates(): array
    {
        return ReportTemplate::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get([
                'id',
                'name',
                'description',
                'category',
                'default_format',
            ])
            ->toArray();
    }

    public function availableMetrics(): array
    {
        return [
            ['id' => 'roster', 'label' => 'Department Roster (✓ / ×)'],
            ['id' => 'attendance_register', 'label' => 'Attendance Register (Detailed)'],
            ['id' => 'employee_summary', 'label' => 'Employee Summary'],
            ['id' => 'daily_summary', 'label' => 'Daily Summary'],
            ['id' => 'exceptions', 'label' => 'Exceptions (Missing checkout, etc.)'],
            ['id' => 'branch_breakdown', 'label' => 'Branch Breakdown'],
            ['id' => 'late_arrivals', 'label' => 'Late Arrivals'],
            ['id' => 'device_health', 'label' => 'Device Health'],
        ];
    }

    public function history(int $page, int $perPage): LengthAwarePaginator
    {
        $page = $page > 0 ? $page : 1;
        $perPage = $perPage > 0 && $perPage <= 200 ? $perPage : 10;

        return ReportRun::query()
            ->leftJoin('users', 'users.id', '=', 'report_runs.created_by_user_id')
            ->select([
                'report_runs.id',
                'report_runs.name',
                'report_runs.format',
                'report_runs.status',
                'report_runs.created_at',
                DB::raw('users.name as created_by_name'),
            ])
            ->orderByDesc('report_runs.created_at')
            ->paginate($perPage, ['*'], 'page', $page);
    }

    public function run(User $actor, array $payload, ?string $ipAddress): ReportRun
    {
        $format = (string) ($payload['format'] ?? 'json');
        $metrics = $payload['metrics'] ?? [];

        if (!is_array($metrics)) {
            $metrics = [];
        }

        $from = array_key_exists('from', $payload) ? $payload['from'] : null;
        $to = array_key_exists('to', $payload) ? $payload['to'] : null;

        $definition = [
            'metrics' => array_values(array_map('strval', $metrics)),
            'template_id' => $payload['template_id'] ?? null,
            'schedule_frequency' => $payload['schedule_frequency'] ?? null,
        ];

        $run = $this->db->transaction(function () use ($actor, $payload, $format, $from, $to, $definition): ReportRun {
            return ReportRun::query()->create([
                'name' => (string) $payload['name'],
                'trigger' => (string) $payload['trigger'],
                'format' => $format,
                'status' => 'ready',
                'branch_id' => $payload['branch_id'] ?? null,
                'from_date' => $from,
                'to_date' => $to,
                'created_by_user_id' => $actor->id,
                'template_id' => $payload['template_id'] ?? null,
                'definition' => $definition,
                'result' => $this->buildReportPayload($from, $to, $payload['branch_id'] ?? null, $definition['metrics']),
            ]);
        });

        $this->auditWriter->log(
            $actor->id,
            'report.generated',
            ReportRun::class,
            $run->id,
            null,
            $run->toArray(),
            $ipAddress,
        );

        return $run;
    }

    public function download(ReportRun $run, string $format): StreamedResponse
    {
        $format = in_array($format, ['json', 'csv', 'xlsx'], true) ? $format : 'json';

        if ($format === 'xlsx') {
            if (!class_exists('ZipArchive')) {
                throw new HttpException(
                    500,
                    'XLSX export is not available because PHP ext-zip (ZipArchive) is not enabled for the web server PHP process. Enable extension=zip and restart the server.',
                );
            }

            $base = trim((string) ($run->name ?? ''));
            $base = $base !== '' ? $base : 'report-run-'.$run->id;
            $base = preg_replace('/[^a-zA-Z0-9._-]+/', '-', $base) ?: ('report-run-'.$run->id);
            $base = trim((string) $base, '-');
            $filename = $base.'.xlsx';
            $report = is_array($run->result) ? $run->result : [];

            return response()->streamDownload(function () use ($report): void {
                $this->xlsxExporter->streamToOutput($report);
            }, $filename, [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ]);
        }

        if ($format === 'csv') {
            $filename = 'report-run-'.$run->id.'.csv';

            return response()->streamDownload(function () use ($run): void {
                $out = fopen('php://output', 'wb');
                fputcsv($out, ['metric', 'value']);

                $result = is_array($run->result) ? $run->result : [];
                foreach ($result as $k => $v) {
                    fputcsv($out, [(string) $k, is_scalar($v) ? (string) $v : json_encode($v)]);
                }

                fclose($out);
            }, $filename, [
                'Content-Type' => 'text/csv',
            ]);
        }

        $filename = 'report-run-'.$run->id.'.json';

        return response()->streamDownload(function () use ($run): void {
            echo json_encode([
                'id' => $run->id,
                'name' => $run->name,
                'created_at' => $run->created_at?->toIso8601String(),
                'format' => $run->format,
                'result' => $run->result,
            ], JSON_PRETTY_PRINT);
        }, $filename, [
            'Content-Type' => 'application/json',
        ]);
    }

    private function buildReportPayload(?string $from, ?string $to, ?int $branchId, array $metrics): array
    {
        $fromDate = $from ? Carbon::parse($from)->toDateString() : now()->copy()->startOfMonth()->toDateString();
        $toDate = $to ? Carbon::parse($to)->toDateString() : now()->toDateString();

        $metrics = array_values(array_unique(array_filter(array_map('strval', $metrics), fn ($m) => trim($m) !== '')));
        $allMetrics = [
            'roster',
            'attendance_register',
            'employee_summary',
            'daily_summary',
            'exceptions',
            'branch_breakdown',
            'late_arrivals',
            'device_health',
        ];

        if ($metrics === []) {
            $metrics = $allMetrics;
        }

        $metricsSet = array_fill_keys($metrics, true);

        if (isset($metricsSet['roster'])) {
            $fromDate = Carbon::parse($fromDate)->startOfWeek(Carbon::MONDAY)->toDateString();
            $toDate = Carbon::parse($toDate)->endOfWeek(Carbon::SATURDAY)->toDateString();
        }

        $workdays = $this->countWorkdaysExcludingSunday($fromDate, $toDate);

        $employeesQuery = Employee::query();
        if ($branchId) {
            $employeesQuery->where('branch_id', $branchId);
        }

        $employeesCount = (int) $employeesQuery->count();

        $presentQuery = AttendanceLog::query()
            ->whereDate('log_date', '>=', $fromDate)
            ->whereDate('log_date', '<=', $toDate);

        if ($branchId) {
            $presentQuery->where('branch_id', $branchId);
        }

        $presentDays = (int) $presentQuery
            ->selectRaw('COUNT(DISTINCT CONCAT(employee_id, "-", log_date)) as c')
            ->value('c');

        $expectedDays = $employeesCount > 0 ? $employeesCount * $workdays : 0;
        $compliance = $expectedDays > 0 ? round(($presentDays / $expectedDays) * 100, 1) : 0.0;

        $lateArrivalsCount = (int) AttendanceLog::query()
            ->whereDate('log_date', '>=', $fromDate)
            ->whereDate('log_date', '<=', $toDate)
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->where('late_minutes', '>', 0)
            ->count();

        $deviceCounts = $this->deviceCounts($branchId);
        $branchLabel = $branchId ? (string) (Branch::query()->where('id', $branchId)->value('name') ?? '') : 'All';

        $summary = [
            'employees' => $employeesCount,
            'workdays' => $workdays,
            'expected_days' => $expectedDays,
            'present_days' => $presentDays,
            'compliance_percent' => $compliance,
            'late_arrivals' => $lateArrivalsCount,
            'total_devices' => $deviceCounts['total'],
            'active_devices' => $deviceCounts['active'],
            'offline_devices' => $deviceCounts['offline'],
            'device_health_percent' => $deviceCounts['percent'],
            'selected_metrics' => $metrics,
        ];

        $payload = [
            'generated_at' => now()->toIso8601String(),
            'from' => $fromDate,
            'to' => $toDate,
            'branch' => $branchLabel,
            'summary' => $summary,
        ];

        if (isset($metricsSet['branch_breakdown'])) {
            $payload['branch_breakdown'] = $this->branchBreakdown($fromDate, $toDate, $workdays, $branchId);
        }

        if (isset($metricsSet['late_arrivals'])) {
            $payload['late_arrivals'] = $this->lateArrivalsRows($fromDate, $toDate, $branchId);
        }

        if (isset($metricsSet['device_health'])) {
            $payload['device_health_by_branch'] = $this->deviceHealthByBranch($branchId);
        }

        if (isset($metricsSet['roster'])) {
            $payload['roster'] = $this->rosterPayload($fromDate, $toDate, $branchId);
        }

        if (isset($metricsSet['attendance_register'])) {
            $payload['attendance_rows'] = $this->attendanceSheetRows($fromDate, $toDate, $branchId);
        }

        if (isset($metricsSet['employee_summary'])) {
            $payload['employee_summary'] = $this->employeeSummaryRows($fromDate, $toDate, $branchId);
        }

        if (isset($metricsSet['daily_summary'])) {
            $payload['daily_summary'] = $this->dailySummaryRows($fromDate, $toDate, $branchId);
        }

        if (isset($metricsSet['exceptions'])) {
            $payload['exceptions'] = $this->exceptionsRows($fromDate, $toDate, $branchId);
        }

        return $payload;
    }

    private function rosterPayload(string $from, string $to, ?int $branchId): array
    {
        $period = CarbonPeriod::create($from, $to);
        $dates = [];
        foreach ($period as $d) {
            $dates[] = $d->toDateString();
        }

        $employees = Employee::query()
            ->select(['id', 'employee_code', 'first_name', 'middle_name', 'last_name', 'department', 'branch_id', 'status'])
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->where('status', 'active')
            ->orderBy('department')
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->limit(20000)
            ->get();

        $logs = AttendanceLog::query()
            ->select(['employee_id', 'log_date'])
            ->whereDate('log_date', '>=', $from)
            ->whereDate('log_date', '<=', $to)
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->get();

        $presence = [];
        foreach ($logs as $l) {
            $empId = (int) $l->employee_id;
            $day = Carbon::parse($l->log_date)->toDateString();
            $presence[$empId][$day] = true;
        }

        $departments = [];
        foreach ($employees as $e) {
            $dept = trim((string) ($e->department ?? ''));
            $dept = $dept !== '' ? $dept : 'General';
            $departments[$dept] ??= [];

            $nameParts = [trim((string) $e->first_name), trim((string) ($e->middle_name ?? '')), trim((string) $e->last_name)];
            $employeeName = trim(implode(' ', array_values(array_filter($nameParts, fn ($p) => $p !== ''))));

            $departments[$dept][] = [
                'employee_id' => (int) $e->id,
                'employee_code' => (string) ($e->employee_code ?? ''),
                'employee_name' => $employeeName,
            ];
        }

        $deptRows = [];
        foreach ($departments as $dept => $deptEmployees) {
            $deptRows[] = [
                'department' => (string) $dept,
                'employees' => $deptEmployees,
            ];
        }

        return [
            'dates' => $dates,
            'presence' => $presence,
            'departments' => $deptRows,
        ];
    }

    private function attendanceSheetRows(string $from, string $to, ?int $branchId): array
    {
        $rows = AttendanceLog::query()
            ->leftJoin('employees', 'employees.id', '=', 'attendance_logs.employee_id')
            ->leftJoin('branches', 'branches.id', '=', 'attendance_logs.branch_id')
            ->select([
                'attendance_logs.id',
                'attendance_logs.log_date',
                'attendance_logs.employee_id',
                'attendance_logs.branch_id',
                'attendance_logs.status',
                'attendance_logs.check_in_time',
                'attendance_logs.check_out_time',
                'attendance_logs.late_minutes',
                'attendance_logs.overtime_minutes',
                DB::raw("COALESCE(employees.employee_code, '') as employee_code"),
                DB::raw("CONCAT(COALESCE(employees.first_name,''),' ',COALESCE(employees.last_name,'')) as employee_name"),
                DB::raw('branches.name as branch_name'),
            ])
            ->whereDate('attendance_logs.log_date', '>=', $from)
            ->whereDate('attendance_logs.log_date', '<=', $to)
            ->when($branchId, fn ($q) => $q->where('attendance_logs.branch_id', $branchId))
            ->orderBy('attendance_logs.log_date')
            ->orderBy('employee_name')
            ->limit(20000)
            ->get();

        return $rows->map(function ($r): array {
            $logDate = (string) $r->log_date;
            $checkIn = $r->check_in_time ? Carbon::parse($r->check_in_time) : null;
            $checkOut = $r->check_out_time ? Carbon::parse($r->check_out_time) : null;

            $calc = $this->calculateAttendanceDay($logDate, $checkIn, $checkOut);

            return [
                'id' => (int) $r->id,
                'log_date' => $logDate,
                'branch_id' => (int) $r->branch_id,
                'branch_name' => (string) ($r->branch_name ?? ''),
                'employee_id' => (int) $r->employee_id,
                'employee_code' => (string) ($r->employee_code ?? ''),
                'employee_name' => (string) ($r->employee_name ?? ''),
                'status' => (string) ($r->status ?? ''),
                'check_in_time' => $checkIn ? $checkIn->format('g:i A') : null,
                'check_out_time' => $checkOut ? $checkOut->format('g:i A') : null,
                'late_minutes' => (int) ($r->late_minutes ?? 0),
                'worked_minutes' => $calc['worked_minutes'],
                'worked_hours' => $this->formatMinutesAsHours($calc['worked_minutes']),
                'regular_minutes' => $calc['regular_minutes'],
                'overtime_minutes' => $calc['overtime_minutes'],
                'early_leave_minutes' => $calc['early_leave_minutes'],
                'day_type' => $calc['day_type'],
            ];
        })->toArray();
    }

    private function employeeSummaryRows(string $from, string $to, ?int $branchId): array
    {
        $q = AttendanceLog::query()
            ->leftJoin('employees', 'employees.id', '=', 'attendance_logs.employee_id')
            ->leftJoin('branches', 'branches.id', '=', 'attendance_logs.branch_id')
            ->select([
                'attendance_logs.employee_id',
                DB::raw("COALESCE(employees.employee_code, '') as employee_code"),
                DB::raw("CONCAT(COALESCE(employees.first_name,''),' ',COALESCE(employees.last_name,'')) as employee_name"),
                DB::raw('branches.name as branch_name'),
                'attendance_logs.log_date',
                'attendance_logs.check_in_time',
                'attendance_logs.check_out_time',
                DB::raw('COUNT(*) as days_recorded'),
                DB::raw('SUM(CASE WHEN attendance_logs.late_minutes > 0 THEN 1 ELSE 0 END) as late_days'),
                DB::raw('SUM(attendance_logs.late_minutes) as late_minutes_total'),
                DB::raw('SUM(CASE WHEN attendance_logs.check_out_time IS NULL THEN 1 ELSE 0 END) as missing_checkout_days'),
            ])
            ->whereDate('attendance_logs.log_date', '>=', $from)
            ->whereDate('attendance_logs.log_date', '<=', $to)
            ->when($branchId, fn ($qq) => $qq->where('attendance_logs.branch_id', $branchId))
            ->groupBy(
                'attendance_logs.employee_id',
                'employees.employee_code',
                'employees.first_name',
                'employees.last_name',
                'branches.name',
                'attendance_logs.log_date',
                'attendance_logs.check_in_time',
                'attendance_logs.check_out_time',
            )
            ->orderBy('employee_name')
            ->limit(20000);

        $rows = $q->get();

        $byEmployee = [];
        foreach ($rows as $r) {
            $empId = (int) $r->employee_id;
            $byEmployee[$empId] ??= [
                'employee_id' => $empId,
                'employee_code' => (string) ($r->employee_code ?? ''),
                'employee_name' => (string) ($r->employee_name ?? ''),
                'branch_name' => (string) ($r->branch_name ?? ''),
                'days_recorded' => 0,
                'late_days' => 0,
                'late_minutes_total' => 0,
                'missing_checkout_days' => 0,
                'worked_minutes_total' => 0,
                'overtime_minutes_total' => 0,
                'early_leave_days' => 0,
                'half_days' => 0,
                'full_days' => 0,
            ];

            $logDate = (string) $r->log_date;
            $checkIn = $r->check_in_time ? Carbon::parse($r->check_in_time) : null;
            $checkOut = $r->check_out_time ? Carbon::parse($r->check_out_time) : null;
            $calc = $this->calculateAttendanceDay($logDate, $checkIn, $checkOut);

            $byEmployee[$empId]['days_recorded'] += 1;
            $byEmployee[$empId]['late_days'] += (int) ($r->late_days ?? 0);
            $byEmployee[$empId]['late_minutes_total'] += (int) ($r->late_minutes_total ?? 0);
            $byEmployee[$empId]['missing_checkout_days'] += (int) ($r->missing_checkout_days ?? 0);
            $byEmployee[$empId]['worked_minutes_total'] += $calc['worked_minutes'];
            $byEmployee[$empId]['overtime_minutes_total'] += $calc['overtime_minutes'];
            $byEmployee[$empId]['early_leave_days'] += $calc['early_leave_minutes'] > 0 ? 1 : 0;
            $byEmployee[$empId]['half_days'] += $calc['day_type'] === 'Half Day' ? 1 : 0;
            $byEmployee[$empId]['full_days'] += $calc['day_type'] === 'Full Day' ? 1 : 0;
        }

        $out = array_values(array_map(function (array $row): array {
            return [
                'employee_id' => (int) $row['employee_id'],
                'employee_code' => (string) $row['employee_code'],
                'employee_name' => (string) $row['employee_name'],
                'branch_name' => (string) $row['branch_name'],
                'days_recorded' => (int) $row['days_recorded'],
                'full_days' => (int) $row['full_days'],
                'half_days' => (int) $row['half_days'],
                'early_leave_days' => (int) $row['early_leave_days'],
                'late_days' => (int) $row['late_days'],
                'late_minutes_total' => (int) $row['late_minutes_total'],
                'worked_minutes_total' => (int) $row['worked_minutes_total'],
                'worked_hours_total' => $this->formatMinutesAsHours((int) $row['worked_minutes_total']),
                'overtime_minutes_total' => (int) $row['overtime_minutes_total'],
                'missing_checkout_days' => (int) $row['missing_checkout_days'],
            ];
        }, $byEmployee));

        usort($out, fn ($a, $b) => strcmp((string) $a['employee_name'], (string) $b['employee_name']));

        return $out;
    }

    private function dailySummaryRows(string $from, string $to, ?int $branchId): array
    {
        $rows = AttendanceLog::query()
            ->select([
                'attendance_logs.log_date',
                DB::raw('COUNT(DISTINCT attendance_logs.employee_id) as employees_present'),
                DB::raw('SUM(CASE WHEN attendance_logs.late_minutes > 0 THEN 1 ELSE 0 END) as late_count'),
                DB::raw('SUM(attendance_logs.late_minutes) as late_minutes_total'),
                DB::raw('SUM(attendance_logs.overtime_minutes) as overtime_minutes_total'),
                DB::raw('SUM(CASE WHEN attendance_logs.check_out_time IS NULL THEN 1 ELSE 0 END) as missing_checkout_count'),
            ])
            ->whereDate('attendance_logs.log_date', '>=', $from)
            ->whereDate('attendance_logs.log_date', '<=', $to)
            ->when($branchId, fn ($q) => $q->where('attendance_logs.branch_id', $branchId))
            ->groupBy('attendance_logs.log_date')
            ->orderBy('attendance_logs.log_date')
            ->get();

        return $rows->map(fn ($r) => [
            'log_date' => (string) $r->log_date,
            'employees_present' => (int) ($r->employees_present ?? 0),
            'late_count' => (int) ($r->late_count ?? 0),
            'late_minutes_total' => (int) ($r->late_minutes_total ?? 0),
            'overtime_minutes_total' => (int) ($r->overtime_minutes_total ?? 0),
            'missing_checkout_count' => (int) ($r->missing_checkout_count ?? 0),
        ])->toArray();
    }

    private function exceptionsRows(string $from, string $to, ?int $branchId): array
    {
        $rows = AttendanceLog::query()
            ->leftJoin('employees', 'employees.id', '=', 'attendance_logs.employee_id')
            ->leftJoin('branches', 'branches.id', '=', 'attendance_logs.branch_id')
            ->select([
                'attendance_logs.id',
                'attendance_logs.log_date',
                'attendance_logs.employee_id',
                'attendance_logs.late_minutes',
                'attendance_logs.check_in_time',
                'attendance_logs.check_out_time',
                DB::raw("COALESCE(employees.employee_code, '') as employee_code"),
                DB::raw("CONCAT(COALESCE(employees.first_name,''),' ',COALESCE(employees.last_name,'')) as employee_name"),
                DB::raw('branches.name as branch_name'),
            ])
            ->whereDate('attendance_logs.log_date', '>=', $from)
            ->whereDate('attendance_logs.log_date', '<=', $to)
            ->when($branchId, fn ($q) => $q->where('attendance_logs.branch_id', $branchId))
            ->orderByDesc('attendance_logs.log_date')
            ->limit(20000)
            ->get();

        $out = [];
        foreach ($rows as $r) {
            $logDate = (string) $r->log_date;
            $checkIn = $r->check_in_time ? Carbon::parse($r->check_in_time) : null;
            $checkOut = $r->check_out_time ? Carbon::parse($r->check_out_time) : null;
            $calc = $this->calculateAttendanceDay($logDate, $checkIn, $checkOut);

            $types = [];
            if ($checkIn && !$checkOut) {
                $types[] = 'missing_checkout';
            }
            if ($calc['early_leave_minutes'] > 0) {
                $types[] = 'early_leave';
            }
            if ($calc['day_type'] === 'Half Day') {
                $types[] = 'half_day';
            }

            foreach ($types as $t) {
                $out[] = [
                    'id' => (int) $r->id,
                    'exception_type' => $t,
                    'log_date' => $logDate,
                    'employee_id' => (int) $r->employee_id,
                    'employee_code' => (string) ($r->employee_code ?? ''),
                    'employee_name' => (string) ($r->employee_name ?? ''),
                    'branch_name' => (string) ($r->branch_name ?? ''),
                    'late_minutes' => (int) ($r->late_minutes ?? 0),
                    'check_in_time' => $checkIn ? $checkIn->format('g:i A') : null,
                    'check_out_time' => $checkOut ? $checkOut->format('g:i A') : null,
                    'worked_hours' => $this->formatMinutesAsHours($calc['worked_minutes']),
                    'early_leave_minutes' => $calc['early_leave_minutes'],
                ];
            }
        }

        return $out;
    }

    private function calculateAttendanceDay(string $logDate, ?Carbon $checkIn, ?Carbon $checkOut): array
    {
        if (!$checkIn) {
            return [
                'worked_minutes' => 0,
                'regular_minutes' => 0,
                'overtime_minutes' => 0,
                'early_leave_minutes' => 0,
                'day_type' => 'Absent',
            ];
        }

        if (!$checkOut) {
            return [
                'worked_minutes' => 0,
                'regular_minutes' => 0,
                'overtime_minutes' => 0,
                'early_leave_minutes' => 0,
                'day_type' => 'Missing Checkout',
            ];
        }

        $worked = max(0, $checkIn->diffInMinutes($checkOut, false));

        $breakStart = Carbon::parse($logDate.' '.self::BREAK_START);
        $breakEnd = Carbon::parse($logDate.' '.self::BREAK_END);
        $worked -= $this->overlapMinutes($checkIn, $checkOut, $breakStart, $breakEnd);
        $worked = max(0, $worked);

        $regular = min(self::REGULAR_DAY_MINUTES, $worked);
        $overtime = max(0, $worked - self::REGULAR_DAY_MINUTES);

        $shiftEnd = Carbon::parse($logDate.' '.self::SHIFT_END);
        $earlyLeave = $checkOut->lessThan($shiftEnd) ? max(0, $checkOut->diffInMinutes($shiftEnd, false)) : 0;

        $dayType = 'Partial';
        if ($regular >= self::REGULAR_DAY_MINUTES) {
            $dayType = 'Full Day';
        } elseif ($regular >= self::HALF_DAY_MINUTES) {
            $dayType = 'Half Day';
        }

        return [
            'worked_minutes' => $worked,
            'regular_minutes' => $regular,
            'overtime_minutes' => $overtime,
            'early_leave_minutes' => $earlyLeave,
            'day_type' => $dayType,
        ];
    }

    private function overlapMinutes(Carbon $aStart, Carbon $aEnd, Carbon $bStart, Carbon $bEnd): int
    {
        $start = $aStart->greaterThan($bStart) ? $aStart : $bStart;
        $end = $aEnd->lessThan($bEnd) ? $aEnd : $bEnd;
        $diff = $start->diffInMinutes($end, false);
        return max(0, $diff);
    }

    private function formatMinutesAsHours(int $minutes): string
    {
        $minutes = max(0, $minutes);
        $h = (int) floor($minutes / 60);
        $m = $minutes % 60;
        return sprintf('%dh %02dm', $h, $m);
    }

    private function branchBreakdown(string $from, string $to, int $workdays, ?int $branchId): array
    {
        $employeesByBranch = Employee::query()
            ->selectRaw('branch_id, COUNT(*) as c')
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->groupBy('branch_id')
            ->pluck('c', 'branch_id');

        $presentByBranch = AttendanceLog::query()
            ->selectRaw('branch_id, COUNT(DISTINCT CONCAT(employee_id, "-", log_date)) as c')
            ->whereDate('log_date', '>=', $from)
            ->whereDate('log_date', '<=', $to)
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->groupBy('branch_id')
            ->pluck('c', 'branch_id');

        $branchIds = collect($employeesByBranch->keys())
            ->merge($presentByBranch->keys())
            ->filter()
            ->unique()
            ->values();

        if ($branchId) {
            $branchIds = collect([$branchId]);
        }

        $names = Branch::query()->whereIn('id', $branchIds)->pluck('name', 'id');

        $out = [];
        foreach ($branchIds as $id) {
            $employees = (int) ($employeesByBranch[$id] ?? 0);
            $present = (int) ($presentByBranch[$id] ?? 0);
            $expected = $employees > 0 ? $employees * $workdays : 0;
            $percent = $expected > 0 ? round(($present / $expected) * 100, 1) : 0.0;

            $out[] = [
                'branch_id' => (int) $id,
                'branch_name' => (string) ($names[$id] ?? ''),
                'employees' => $employees,
                'present_days' => $present,
                'expected_days' => $expected,
                'compliance_percent' => $percent,
            ];
        }

        usort($out, fn ($a, $b) => ($b['compliance_percent'] <=> $a['compliance_percent']));

        return $out;
    }

    private function lateArrivalsRows(string $from, string $to, ?int $branchId): array
    {
        $rows = AttendanceLog::query()
            ->leftJoin('employees', 'employees.id', '=', 'attendance_logs.employee_id')
            ->leftJoin('branches', 'branches.id', '=', 'attendance_logs.branch_id')
            ->select([
                'attendance_logs.log_date',
                'attendance_logs.employee_id',
                'attendance_logs.late_minutes',
                'attendance_logs.check_in_time',
                DB::raw("CONCAT(COALESCE(employees.first_name,''),' ',COALESCE(employees.last_name,'')) as employee_name"),
                DB::raw('branches.name as branch_name'),
            ])
            ->whereDate('attendance_logs.log_date', '>=', $from)
            ->whereDate('attendance_logs.log_date', '<=', $to)
            ->when($branchId, fn ($q) => $q->where('attendance_logs.branch_id', $branchId))
            ->where('attendance_logs.late_minutes', '>', 0)
            ->orderByDesc('attendance_logs.late_minutes')
            ->limit(1000)
            ->get();

        return $rows->map(fn ($r) => [
            'log_date' => (string) $r->log_date,
            'employee_id' => (int) $r->employee_id,
            'employee_name' => (string) ($r->employee_name ?? ''),
            'branch_name' => (string) ($r->branch_name ?? ''),
            'late_minutes' => (int) $r->late_minutes,
            'check_in_time' => $r->check_in_time ? Carbon::parse($r->check_in_time)->toDateTimeString() : null,
        ])->toArray();
    }

    private function deviceCounts(?int $branchId): array
    {
        $query = Device::query();

        if ($branchId) {
            $query
                ->join('employees', 'employees.id', '=', 'devices.employee_id')
                ->where('employees.branch_id', $branchId);
        }

        $total = (int) (clone $query)->count();
        $active = (int) (clone $query)->where('devices.is_active', true)->count();
        $offline = max(0, $total - $active);
        $percent = $total > 0 ? round(($active / $total) * 100, 1) : 0.0;

        return [
            'total' => $total,
            'active' => $active,
            'offline' => $offline,
            'percent' => $percent,
        ];
    }

    private function deviceHealthByBranch(?int $branchId): array
    {
        $deviceQuery = DB::table('branches')
            ->leftJoin('employees', 'employees.branch_id', '=', 'branches.id')
            ->leftJoin('devices', 'devices.employee_id', '=', 'employees.id')
            ->select([
                'branches.id as branch_id',
                'branches.name as branch_name',
                DB::raw('COUNT(devices.id) as total_devices'),
                DB::raw('SUM(CASE WHEN devices.is_active = 1 THEN 1 ELSE 0 END) as active_devices'),
            ])
            ->groupBy('branches.id', 'branches.name')
            ->orderBy('branches.name');

        if ($branchId) {
            $deviceQuery->where('branches.id', $branchId);
        }

        $rows = $deviceQuery->get();

        return $rows->map(function ($r) {
            $total = (int) ($r->total_devices ?? 0);
            $active = (int) ($r->active_devices ?? 0);
            $offline = max(0, $total - $active);
            $percent = $total > 0 ? round(($active / $total) * 100, 1) : 0.0;

            return [
                'branch_id' => (int) $r->branch_id,
                'branch_name' => (string) ($r->branch_name ?? ''),
                'total_devices' => $total,
                'active_devices' => $active,
                'offline_devices' => $offline,
                'health_percent' => $percent,
            ];
        })->toArray();
    }

    private function topPerformingBranch(string $from, string $to, int $workdays): array
    {
        if ($workdays <= 0) {
            return ['name' => null, 'efficiency' => null];
        }

        $rows = AttendanceLog::query()
            ->selectRaw('branch_id, COUNT(DISTINCT CONCAT(employee_id, "-", log_date)) as present_days')
            ->whereDate('log_date', '>=', $from)
            ->whereDate('log_date', '<=', $to)
            ->groupBy('branch_id')
            ->orderByDesc('present_days')
            ->limit(1)
            ->first();

        if (!$rows || !$rows->branch_id) {
            return ['name' => null, 'efficiency' => null];
        }

        $branchId = (int) $rows->branch_id;
        $present = (int) $rows->present_days;

        $employees = (int) Employee::query()->where('branch_id', $branchId)->count();
        $expected = $employees > 0 ? $employees * $workdays : 0;
        $eff = $expected > 0 ? round(($present / $expected) * 100, 1) : 0.0;

        $name = Branch::query()->where('id', $branchId)->value('name');

        return ['name' => $name, 'efficiency' => $eff];
    }

    private function countWorkdaysExcludingSunday(string $from, string $to): int
    {
        $start = Carbon::parse($from)->startOfDay();
        $end = Carbon::parse($to)->startOfDay();

        if ($end->lessThan($start)) {
            return 0;
        }

        $count = 0;
        $cursor = $start->copy();

        while ($cursor->lessThanOrEqualTo($end)) {
            if ((int) $cursor->dayOfWeek !== Carbon::SUNDAY) {
                $count++;
            }
            $cursor->addDay();
        }

        return $count;
    }
}
