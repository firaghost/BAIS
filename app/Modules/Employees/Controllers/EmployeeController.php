<?php

declare(strict_types=1);

namespace App\Modules\Employees\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Audit\Models\AuditLog;
use App\Modules\Auth\Models\Device;
use App\Modules\Employees\Models\Employee;
use App\Modules\Employees\Requests\EmployeeBulkUploadRequest;
use App\Modules\Employees\Requests\EmployeePhotoUploadRequest;
use App\Modules\Employees\Requests\EmployeeProvisionUserRequest;
use App\Modules\Employees\Requests\EmployeeStoreRequest;
use App\Modules\Employees\Requests\EmployeeUpdateRequest;
use App\Modules\Employees\Services\EmployeeProvisioningService;
use App\Modules\Employees\Services\EmployeeService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Illuminate\Support\Facades\DB;

class EmployeeController extends Controller
{
    public function __construct(
        private readonly EmployeeService $employeeService,
        private readonly EmployeeProvisioningService $provisioningService,
    )
    {
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
            // 6 days/week: Sunday off
            if ((int) $cursor->dayOfWeek !== Carbon::SUNDAY) {
                $count++;
            }
            $cursor->addDay();
        }

        return $count;
    }

    public function bulkTemplate(Request $request): StreamedResponse
    {
        $this->authorize('create', Employee::class);

        $format = is_string($request->query('format')) ? strtolower(trim((string) $request->query('format'))) : 'xls';

        if ($format === 'csv') {
            $filename = 'employees-bulk-upload-template.csv';

            $callback = static function (): void {
                $out = fopen('php://output', 'wb');
                fputcsv($out, [
                    'branch_code',
                    'branch_name',
                    'first_name',
                    'middle_name',
                    'last_name',
                    'email',
                    'phone',
                    'department',
                    'job_title',
                    'hire_date',
                    'status',
                ]);
                fputcsv($out, [
                    'HQ',
                    'Head Office',
                    'Felix',
                    '',
                    'Montero',
                    'felix.m@company.com',
                    '+1-555-0100',
                    'Retail Banking',
                    'Senior Teller',
                    '2026-01-15',
                    'active',
                ]);
                fclose($out);
            };

            return response()->streamDownload($callback, $filename, [
                'Content-Type' => 'text/csv',
            ]);
        }

        $filename = 'employees-bulk-upload-template.xls';

        $callback = static function (): void {
            $html = '<html><head><meta charset="utf-8" />'
                . '<style>'
                . 'body{font-family:Calibri,Arial,sans-serif;font-size:11pt;}'
                . 'table{border-collapse:collapse;}'
                . 'th{background:#0a1f43;color:#ffffff;font-weight:700;border:1px solid #cbd5e1;padding:8px;white-space:nowrap;}'
                . 'td{border:1px solid #cbd5e1;padding:6px;}'
                . '.note{margin:12px 0;padding:10px;border:1px solid #e2e8f0;background:#f8fafc;}'
                . '</style>'
                . '</head><body>'
                . '<div class="note"><b>How to use:</b> Fill rows, then use <b>Save As → CSV</b> and upload the CSV in the Bulk Upload form.</div>'
                . '<table>'
                . '<tr>'
                . '<th>branch_code</th>'
                . '<th>branch_name</th>'
                . '<th>first_name</th>'
                . '<th>middle_name</th>'
                . '<th>last_name</th>'
                . '<th>email</th>'
                . '<th>phone</th>'
                . '<th>department</th>'
                . '<th>job_title</th>'
                . '<th>hire_date (YYYY-MM-DD)</th>'
                . '<th>status (active/inactive)</th>'
                . '</tr>'
                . '<tr>'
                . '<td>HQ</td>'
                . '<td>Head Office</td>'
                . '<td>Felix</td>'
                . '<td></td>'
                . '<td>Montero</td>'
                . '<td>felix.m@company.com</td>'
                . '<td>+1-555-0100</td>'
                . '<td>Retail Banking</td>'
                . '<td>Senior Teller</td>'
                . '<td>2026-01-15</td>'
                . '<td>active</td>'
                . '</tr>'
                . '</table>'
                . '</body></html>';

            echo $html;
        };

        return response()->streamDownload($callback, $filename, [
            'Content-Type' => 'application/vnd.ms-excel; charset=utf-8',
        ]);
    }

    public function bulkUpload(EmployeeBulkUploadRequest $request): JsonResponse
    {
        $this->authorize('create', Employee::class);

        $result = $this->employeeService->bulkUploadCsv(
            $request->user(),
            $request->fileUpload(),
            $request->ip(),
        );

        return response()->json([
            'data' => $result,
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Employee::class);

        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'sort' => ['nullable', 'string', 'in:name,recent,compliance'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'branch_id' => ['nullable', 'integer', 'min:1'],
            'department' => ['nullable', 'string', 'max:150'],
            'status' => ['nullable', 'string', 'in:active,inactive,on_leave,probation,suspended'],
        ]);

        $search = $validated['search'] ?? null;
        $sort = $validated['sort'] ?? 'name';
        $page = (int) ($validated['page'] ?? 1);
        $perPage = (int) ($validated['per_page'] ?? 8);
        $branchId = isset($validated['branch_id']) ? (int) $validated['branch_id'] : null;
        $department = isset($validated['department']) ? trim((string) $validated['department']) : null;
        $status = $validated['status'] ?? null;

        $now = now();
        $monthStart = $now->copy()->startOfMonth()->toDateString();
        $today = $now->toDateString();

        $attendanceAgg = DB::table('attendance_logs')
            ->select([
                'employee_id',
                DB::raw('COUNT(DISTINCT log_date) as mtd_present_days'),
                DB::raw('SUM(CASE WHEN late_minutes > 0 THEN 1 ELSE 0 END) as mtd_late_days'),
            ])
            ->whereDate('log_date', '>=', $monthStart)
            ->whereDate('log_date', '<=', $today)
            ->groupBy('employee_id');

        $query = Employee::query()
            ->with(['branch', 'user'])
            ->leftJoinSub($attendanceAgg, 'mtd', function ($join): void {
                $join->on('mtd.employee_id', '=', 'employees.id');
            })
            ->select([
                'employees.*',
                DB::raw('COALESCE(mtd.mtd_present_days, 0) as mtd_present_days'),
                DB::raw('COALESCE(mtd.mtd_late_days, 0) as mtd_late_days'),
            ]);

        if ($branchId) {
            $query->where('employees.branch_id', $branchId);
        }

        if ($department !== null && $department !== '' && $department !== 'all') {
            $query->where('employees.department', $department);
        }

        if ($status !== null && $status !== '' && $status !== 'all') {
            $query->where('employees.status', $status);
        }

        // Search by name, code, or email
        if (is_string($search) && trim($search) !== '') {
            $search = trim($search);
            $query->where(function ($sub) use ($search): void {
                $sub->where('employee_code', 'like', '%'.$search.'%')
                    ->orWhere('first_name', 'like', '%'.$search.'%')
                    ->orWhere('middle_name', 'like', '%'.$search.'%')
                    ->orWhere('last_name', 'like', '%'.$search.'%')
                    ->orWhere('email', 'like', '%'.$search.'%')
                    ->orWhere('job_title', 'like', '%'.$search.'%')
                    ->orWhere('department', 'like', '%'.$search.'%');
            });
        }

        // Sorting
        $sortOptions = [
            'name' => [
                ['last_name', 'asc'],
                ['first_name', 'asc'],
            ],
            'recent' => [
                ['updated_at', 'desc'],
            ],
            'compliance' => [
                ['last_name', 'asc'],
            ],
        ];

        $orders = $sortOptions[$sort] ?? $sortOptions['name'];

        foreach ($orders as $order) {
            $field = (string) ($order[0] ?? 'last_name');
            $dir = strtolower((string) ($order[1] ?? 'asc')) === 'desc' ? 'desc' : 'asc';
            $query->orderBy($field, $dir);
        }

        $paginator = $query->paginate($perPage, ['*'], 'page', $page);
        $data = $paginator->items();

        $expectedWorkdays = $this->countWorkdaysExcludingSunday($monthStart, $today);

        // Add computed fields for UI
        $data = array_map(function ($emp) use ($expectedWorkdays) {
            $firstName = $emp->first_name ?? '';
            $lastName = $emp->last_name ?? '';
            $emp->full_name = trim("$firstName $lastName") ?: '—';
            $emp->initials = strtoupper(substr($firstName, 0, 1) . substr($lastName, 0, 1)) ?: '—';
            $emp->branch_name = $emp->branch?->name ?? '—';

            // Device info: keep stable (real device binding can be added later)
            $emp->device_bound = null;
            $emp->device_name = null;
            $emp->device_id = null;

            $present = (int) ($emp->mtd_present_days ?? 0);
            $late = (int) ($emp->mtd_late_days ?? 0);
            $absent = max(0, $expectedWorkdays - $present);
            $score = $expectedWorkdays > 0 ? (int) round(($present / $expectedWorkdays) * 100) : 0;

            $emp->present_days = $present;
            $emp->late_days = $late;
            $emp->absent_days = $absent;
            $emp->compliance_score = $score;

            // Recent activity: not available without per-employee queries
            $emp->recent_activity = [];

            unset($emp->mtd_present_days, $emp->mtd_late_days);

            return $emp;
        }, $data);

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function show(Request $request, Employee $employee): JsonResponse
    {
        $this->authorize('view', $employee);

        $employee->load(['branch', 'user']);

        $firstName = $employee->first_name ?? '';
        $lastName = $employee->last_name ?? '';

        $employee->full_name = trim("{$firstName} {$lastName}") ?: '—';
        $employee->initials = strtoupper(substr($firstName, 0, 1) . substr($lastName, 0, 1)) ?: '—';
        $employee->branch_name = $employee->branch?->name ?? '—';

        $activeDevice = null;
        if ($employee->user_id) {
            $activeDevice = Device::query()
                ->where('user_id', (int) $employee->user_id)
                ->where('is_active', true)
                ->orderByDesc('created_at')
                ->first();
        }

        $employee->device_bound = $activeDevice !== null;
        $employee->device_name = $activeDevice?->device_name;
        $employee->device_id = $activeDevice?->device_identifier;

        $activityQuery = AuditLog::query()->orderByDesc('created_at');

        if ($employee->user_id) {
            $activityQuery->where('user_id', (int) $employee->user_id);
        } else {
            $activityQuery->where('model_type', Employee::class)->where('model_id', (int) $employee->id);
        }

        $employee->recent_activity = $activityQuery
            ->limit(10)
            ->get(['action', 'ip_address', 'created_at'])
            ->map(static function (AuditLog $log): array {
                return [
                    'action' => (string) $log->action,
                    'time' => $log->created_at ? $log->created_at->toDateTimeString() : null,
                    'location' => $log->ip_address,
                ];
            })
            ->values()
            ->all();

        return response()->json([
            'data' => $employee,
        ]);
    }

    public function departments(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Employee::class);

        $validated = $request->validate([
            'branch_id' => ['nullable', 'integer', 'min:1'],
        ]);

        $branchId = isset($validated['branch_id']) ? (int) $validated['branch_id'] : null;

        $q = Employee::query()
            ->whereNotNull('department')
            ->where('department', '!=', '')
            ->when($branchId, fn ($x) => $x->where('branch_id', $branchId))
            ->select('department')
            ->distinct()
            ->orderBy('department');

        return response()->json([
            'data' => $q->pluck('department')->map(fn ($d) => (string) $d)->values()->all(),
        ]);
    }

    public function store(EmployeeStoreRequest $request): JsonResponse
    {
        $this->authorize('create', Employee::class);

        $created = $this->employeeService->create($request->user(), $request->payload(), $request->ip());

        return response()->json(['data' => $created], 201);
    }

    public function update(EmployeeUpdateRequest $request, Employee $employee): JsonResponse
    {
        $this->authorize('update', $employee);

        $updated = $this->employeeService->update($request->user(), $employee, $request->payload(), $request->ip());

        return response()->json(['data' => $updated]);
    }

    public function destroy(Request $request, Employee $employee): JsonResponse
    {
        $this->authorize('delete', $employee);

        $this->employeeService->delete($request->user(), $employee, $request->ip());

        return response()->json(['status' => 'ok']);
    }

    public function uploadPhoto(EmployeePhotoUploadRequest $request, Employee $employee): JsonResponse
    {
        $this->authorize('update', $employee);

        $updated = $this->employeeService->uploadPhoto(
            $request->user(),
            $employee,
            $request->file('photo'),
            $request->ip(),
        );

        return response()->json(['data' => $updated]);
    }

    public function provisionUser(EmployeeProvisionUserRequest $request, Employee $employee): JsonResponse
    {
        $this->authorize('update', $employee);

        $user = $this->provisioningService->provisionUser(
            $request->user(),
            $employee,
            $request->email(),
            $request->name(),
            $request->ip(),
        );

        return response()->json([
            'data' => [
                'user' => $user,
                'default_password' => EmployeeProvisioningService::DEFAULT_PASSWORD,
                'must_change_password' => (bool) $user->must_change_password,
            ],
        ]);
    }
}
