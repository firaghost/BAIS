<?php

declare(strict_types=1);

namespace App\Modules\HrAdmin\Services;

use App\Modules\Attendance\Models\AttendanceLog;
use App\Modules\Audit\Services\AuditWriterService;
use App\Modules\Branches\Models\Branch;
use App\Modules\Employees\Models\Employee;
use App\Modules\Shifts\Models\Shift;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Database\DatabaseManager;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

class HrAdminAttendanceService
{
    public function __construct(
        private readonly DatabaseManager $db,
        private readonly AuditWriterService $auditWriter,
    ) {
    }

    public function listLogs(
        int $actorUserId,
        string $from,
        string $to,
        ?string $department,
        ?string $status,
        string $search,
        int $page,
        int $perPage,
    ): array {
        $page = $page > 0 ? $page : 1;
        $perPage = $perPage > 0 && $perPage <= 100 ? $perPage : 20;

        $singleDay = $from === $to;

        $employees = Employee::query()
            ->where('status', 'active')
            ->when($department, fn ($q) => $q->where('department', $department))
            ->when($search !== '', function ($q) use ($search) {
                $s = '%' . $search . '%';
                $q->where(function ($qq) use ($s) {
                    $qq->where('employee_code', 'like', $s)
                        ->orWhere('first_name', 'like', $s)
                        ->orWhere('last_name', 'like', $s)
                        ->orWhere('department', 'like', $s);
                });
            });

        if ($status === 'absent' && !$singleDay) {
            throw new HttpException(422, 'Absent filter requires a single day (from=to).');
        }

        if ($status === 'absent') {
            $rows = $employees
                ->leftJoin('attendance_logs', function ($join) use ($from): void {
                    $join->on('attendance_logs.employee_id', '=', 'employees.id')
                        ->whereDate('attendance_logs.log_date', '=', $from);
                })
                ->leftJoin('branches', 'branches.id', '=', 'employees.branch_id')
                ->whereNull('attendance_logs.id')
                ->orderBy('employees.last_name')
                ->orderBy('employees.first_name')
                ->select([
                    'employees.id as employee_id',
                    'employees.employee_code as employee_code',
                    'employees.first_name as first_name',
                    'employees.last_name as last_name',
                    'employees.department as department',
                    'branches.name as branch_name',
                    DB::raw('NULL as attendance_id'),
                    DB::raw('NULL as check_in_time'),
                    DB::raw('NULL as check_out_time'),
                    DB::raw('0 as late_minutes'),
                    DB::raw("'absent' as derived_status"),
                    DB::raw('employees.branch_id as branch_id'),
                    DB::raw("'" . $from . "' as log_date"),
                ])
                ->paginate($perPage, ['*'], 'page', $page);

            return $this->formatPaginator($rows);
        }

        $logs = AttendanceLog::query()
            ->join('employees', 'employees.id', '=', 'attendance_logs.employee_id')
            ->leftJoin('branches', 'branches.id', '=', 'attendance_logs.branch_id')
            ->whereDate('attendance_logs.log_date', '>=', $from)
            ->whereDate('attendance_logs.log_date', '<=', $to)
            ->when($department, fn ($q) => $q->where('employees.department', $department))
            ->when($search !== '', function ($q) use ($search) {
                $s = '%' . $search . '%';
                $q->where(function ($qq) use ($s) {
                    $qq->where('employees.employee_code', 'like', $s)
                        ->orWhere('employees.first_name', 'like', $s)
                        ->orWhere('employees.last_name', 'like', $s)
                        ->orWhere('employees.department', 'like', $s);
                });
            })
            ->select([
                'attendance_logs.id as attendance_id',
                'attendance_logs.log_date as log_date',
                'attendance_logs.check_in_time as check_in_time',
                'attendance_logs.check_out_time as check_out_time',
                'attendance_logs.late_minutes as late_minutes',
                'attendance_logs.status as status',
                'employees.id as employee_id',
                'employees.employee_code as employee_code',
                'employees.first_name as first_name',
                'employees.last_name as last_name',
                'employees.department as department',
                'branches.id as branch_id',
                'branches.name as branch_name',
                DB::raw(
                    "CASE "
                    . "WHEN attendance_logs.late_minutes > 0 THEN 'late' "
                    . "WHEN attendance_logs.check_out_time IS NULL AND attendance_logs.log_date < '" . CarbonImmutable::today()->toDateString() . "' THEN 'exception' "
                    . "ELSE 'on_time' END as derived_status"
                ),
            ])
            ->orderByDesc('attendance_logs.log_date')
            ->orderBy('employees.last_name')
            ->orderBy('employees.first_name');

        if ($status) {
            $logs->having('derived_status', '=', $status);
        }

        $rows = $logs->paginate($perPage, ['*'], 'page', $page);

        return $this->formatPaginator($rows);
    }

    public function listDepartments(int $actorUserId): array
    {
        $q = Employee::query()
            ->where('status', 'active')
            ->whereNotNull('department')
            ->where('department', '!=', '')
            ->select('department')
            ->distinct()
            ->orderBy('department');

        return $q->pluck('department')->map(fn ($d) => (string) $d)->values()->all();
    }

    public function employeeLookup(int $actorUserId, string $search, int $limit): array
    {
        $search = trim($search);
        if ($search === '') {
            return [];
        }

        $limit = $limit > 0 && $limit <= 25 ? $limit : 10;

        $s = '%' . $search . '%';

        $q = Employee::query()
            ->leftJoin('branches', 'branches.id', '=', 'employees.branch_id')
            ->where('employees.status', 'active')
            ->where(function ($qq) use ($s): void {
                $qq->where('employees.employee_code', 'like', $s)
                    ->orWhere('employees.first_name', 'like', $s)
                    ->orWhere('employees.last_name', 'like', $s)
                    ->orWhere('employees.department', 'like', $s);
            })
            ->orderBy('employees.last_name')
            ->orderBy('employees.first_name')
            ->limit($limit)
            ->select([
                'employees.id as id',
                'employees.employee_code as employee_code',
                'employees.first_name as first_name',
                'employees.last_name as last_name',
                'employees.department as department',
                'employees.branch_id as branch_id',
                'branches.name as branch_name',
            ]);

        $rows = $q->get();

        return $rows->map(function ($r): array {
            $name = trim(((string) ($r->first_name ?? '')) . ' ' . ((string) ($r->last_name ?? '')));

            return [
                'id' => (int) $r->id,
                'employee_code' => (string) ($r->employee_code ?? ''),
                'name' => $name !== '' ? $name : '—',
                'department' => $r->department ? (string) $r->department : null,
                'branch_id' => is_numeric($r->branch_id) ? (int) $r->branch_id : null,
                'branch_name' => $r->branch_name ? (string) $r->branch_name : null,
            ];
        })->values()->all();
    }

    public function manualEntry(
        int $actorUserId,
        int $employeeId,
        string $logDate,
        string $checkInTime,
        ?string $checkOutTime,
        string $reason,
        ?string $ipAddress,
    ): array {
        $employee = Employee::query()->where('id', $employeeId)->first();
        if (!$employee) {
            throw new HttpException(404, 'Employee not found.');
        }

        $branchId = $employee->branch_id ? (int) $employee->branch_id : null;
        if (!$branchId) {
            $branchId = (int) Branch::query()->orderBy('id')->value('id');
        }

        if (!$branchId) {
            throw new HttpException(422, 'No branch is configured for shift resolution.');
        }

        $branch = Branch::query()->where('id', $branchId)->first();
        if (!$branch) {
            throw new HttpException(404, 'Branch not found.');
        }

        $shift = $this->resolveShiftForBranch($branchId);
        $checkInAt = Carbon::parse($checkInTime);
        $checkOutAt = $checkOutTime ? Carbon::parse($checkOutTime) : null;

        $lateMinutes = $this->calculateLateMinutes($checkInAt, $shift);
        $overtimeMinutes = $checkOutAt ? $this->calculateOvertimeMinutes($checkOutAt, $shift) : 0;

        $created = $this->db->transaction(function () use ($employeeId, $employee, $branchId, $logDate, $checkInTime, $checkOutTime, $lateMinutes, $overtimeMinutes, $reason, $actorUserId, $ipAddress) {
            $old = null;

            $row = AttendanceLog::query()->updateOrCreate(
                ['employee_id' => $employeeId, 'log_date' => $logDate],
                [
                    'user_id' => $employee->user_id ?? $actorUserId,
                    'employee_id' => $employeeId,
                    'branch_id' => $branchId,
                    'log_date' => $logDate,
                    'check_in_time' => $checkInTime,
                    'check_out_time' => $checkOutTime,
                    'late_minutes' => $lateMinutes,
                    'overtime_minutes' => $overtimeMinutes,
                    'status' => $checkOutTime ? 'checked_out' : 'checked_in',
                ],
            );

            $this->auditWriter->log(
                $actorUserId,
                'attendance.manual_entry',
                AttendanceLog::class,
                $row->id,
                $old,
                array_merge($row->toArray(), ['reason' => $reason]),
                $ipAddress,
            );

            return $row;
        });

        return $this->formatRow($created);
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

    private function calculateLateMinutes(Carbon $checkInAt, Shift $shift): int
    {
        $start = $checkInAt->copy()->startOfDay()->setTimeFromTimeString($shift->start_time);
        $lateFrom = $start->copy()->addMinutes((int) $shift->grace_minutes);

        if ($checkInAt->lessThanOrEqualTo($lateFrom)) {
            return 0;
        }

        return (int) $lateFrom->diffInMinutes($checkInAt);
    }

    private function calculateOvertimeMinutes(Carbon $checkOutAt, Shift $shift): int
    {
        $end = $checkOutAt->copy()->startOfDay()->setTimeFromTimeString($shift->end_time);
        $overtimeFrom = $end->copy()->addMinutes((int) $shift->overtime_threshold);

        if ($checkOutAt->lessThanOrEqualTo($overtimeFrom)) {
            return 0;
        }

        return (int) $overtimeFrom->diffInMinutes($checkOutAt);
    }

    public function importCsv(int $actorUserId, string $path, ?string $ipAddress): array
    {
        if ($path === '' || !is_file($path)) {
            throw new HttpException(422, 'File not found.');
        }

        $handle = fopen($path, 'rb');
        if ($handle === false) {
            throw new HttpException(422, 'Unable to read file.');
        }

        $header = fgetcsv($handle);
        if (!is_array($header)) {
            fclose($handle);
            throw new HttpException(422, 'Invalid CSV header.');
        }

        $map = array_flip(array_map(fn ($h) => strtolower(trim((string) $h)), $header));

        $required = ['employee_code', 'log_date', 'check_in_time'];
        foreach ($required as $col) {
            if (!array_key_exists($col, $map)) {
                fclose($handle);
                throw new HttpException(422, "CSV missing required column: {$col}");
            }
        }

        $created = 0;
        $skipped = 0;

        while (($row = fgetcsv($handle)) !== false) {
            $employeeCode = trim((string) ($row[$map['employee_code']] ?? ''));
            $logDate = trim((string) ($row[$map['log_date']] ?? ''));
            $checkIn = trim((string) ($row[$map['check_in_time']] ?? ''));
            $checkOut = isset($map['check_out_time']) ? trim((string) ($row[$map['check_out_time']] ?? '')) : '';

            if ($employeeCode === '' || $logDate === '' || $checkIn === '') {
                $skipped += 1;
                continue;
            }

            $employeeId = (int) Employee::query()->where('employee_code', $employeeCode)->value('id');
            if ($employeeId <= 0) {
                $skipped += 1;
                continue;
            }

            $this->manualEntry(
                $actorUserId,
                $employeeId,
                $logDate,
                $checkIn,
                $checkOut !== '' ? $checkOut : null,
                'CSV import',
                $ipAddress,
            );

            $created += 1;
        }

        fclose($handle);

        return [
            'created' => $created,
            'skipped' => $skipped,
        ];
    }

    private function formatPaginator(LengthAwarePaginator $p): array
    {
        $rawItems = $p->items();

        $branchIds = [];
        foreach ($rawItems as $it) {
            $r = $this->asArray($it);
            if (isset($r['branch_id']) && is_numeric($r['branch_id'])) {
                $id = (int) $r['branch_id'];
                if ($id > 0) {
                    $branchIds[$id] = true;
                }
            }
        }

        $shifts = Shift::query()
            ->whereIn('branch_id', array_keys($branchIds))
            ->orderBy('start_time')
            ->get()
            ->groupBy('branch_id');

        $shiftByBranchId = [];
        foreach ($shifts as $bid => $list) {
            $first = $list->first();
            if ($first) {
                $shiftByBranchId[(int) $bid] = $first;
            }
        }

        $items = array_map(fn ($r) => $this->formatRow($r, $shiftByBranchId), $rawItems);

        return [
            'data' => $items,
            'meta' => [
                'page' => $p->currentPage(),
                'per_page' => $p->perPage(),
                'total' => $p->total(),
                'last_page' => $p->lastPage(),
                'has_prev' => $p->currentPage() > 1,
                'has_next' => $p->currentPage() < $p->lastPage(),
            ],
        ];
    }

    private function formatRow($row, array $shiftByBranchId = []): array
    {
        $r = $this->asArray($row);

        $first = (string) ($r['first_name'] ?? '');
        $last = (string) ($r['last_name'] ?? '');
        $name = trim($first . ' ' . $last);

        $checkIn = $r['check_in_time'] ?? null;
        $checkOut = $r['check_out_time'] ?? null;

        $lateMinutes = (int) ($r['late_minutes'] ?? 0);
        $derivedStatus = (string) ($r['derived_status'] ?? 'on_time');

        $branchId = isset($r['branch_id']) && is_numeric($r['branch_id']) ? (int) $r['branch_id'] : null;
        $logDate = (string) ($r['log_date'] ?? '');

        if ($branchId && $logDate !== '' && $checkIn) {
            $shift = $shiftByBranchId[$branchId] ?? null;

            if ($shift instanceof Shift) {
                $checkInAt = Carbon::parse((string) $checkIn);
                $start = Carbon::parse($logDate)->startOfDay()->setTimeFromTimeString((string) $shift->start_time);
                $lateFrom = $start->copy()->addMinutes((int) $shift->grace_minutes);
                $lateMinutes = $checkInAt->lessThanOrEqualTo($lateFrom) ? 0 : (int) $lateFrom->diffInMinutes($checkInAt);

                if ($lateMinutes > 0) {
                    $derivedStatus = 'late';
                } elseif (!$checkOut && $logDate < CarbonImmutable::today()->toDateString()) {
                    $derivedStatus = 'exception';
                } else {
                    $derivedStatus = 'on_time';
                }
            }
        }

        return [
            'attendance_id' => isset($r['attendance_id']) ? (is_numeric($r['attendance_id']) ? (int) $r['attendance_id'] : null) : null,
            'log_date' => $logDate,
            'employee_id' => (int) ($r['employee_id'] ?? 0),
            'employee_code' => (string) ($r['employee_code'] ?? ''),
            'employee_name' => $name !== '' ? $name : '—',
            'department' => $r['department'] ?? null,
            'branch_id' => $branchId,
            'branch_name' => (string) ($r['branch_name'] ?? ''),
            'check_in_time' => $checkIn ? (string) $checkIn : null,
            'check_out_time' => $checkOut ? (string) $checkOut : null,
            'late_minutes' => $lateMinutes,
            'derived_status' => $derivedStatus,
        ];
    }

    private function asArray($row): array
    {
        if ($row instanceof Model) {
            return $row->getAttributes();
        }

        if (is_array($row)) {
            return $row;
        }

        if (is_object($row)) {
            return get_object_vars($row);
        }

        return [];
    }
}
