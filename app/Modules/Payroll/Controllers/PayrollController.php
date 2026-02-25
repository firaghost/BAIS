<?php

declare(strict_types=1);

namespace App\Modules\Payroll\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Employees\Models\Employee;
use App\Modules\Payroll\Models\PayrollRecord;
use App\Modules\Payroll\Requests\PayrollExportRequest;
use App\Modules\Payroll\Requests\PayrollGenerateRequest;
use App\Modules\Payroll\Requests\PayrollIndexRequest;
use App\Modules\Payroll\Services\PayrollCalculationService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PayrollController extends Controller
{
    public function __construct(private readonly PayrollCalculationService $payrollService)
    {
    }

    public function index(PayrollIndexRequest $request): JsonResponse
    {
        $this->authorize('viewAny', PayrollRecord::class);

        $query = PayrollRecord::query()->with(['user', 'employee'])->orderByDesc('month');

        if ($request->month()) {
            $query->where('month', $request->month());
        }

        if ($request->employeeId()) {
            $query->where('employee_id', $request->employeeId());
        }

        if ($request->branchId()) {
            $query->whereHas('employee', fn ($q) => $q->where('branch_id', $request->branchId()));
        }

        return response()->json(['data' => $query->paginate($request->perPage())]);
    }

    public function generate(PayrollGenerateRequest $request): JsonResponse
    {
        $this->authorize('generate', PayrollRecord::class);

        $target = $this->resolveTargetUser((int) ($request->userIdOrNull() ?? 0), $request->employeeId());

        $record = $this->payrollService->generateForUserMonth(
            $request->user(),
            $target,
            $request->month(),
            $request->ip(),
        );

        return response()->json(['data' => $record]);
    }

    public function exportCsv(PayrollExportRequest $request): StreamedResponse
    {
        $this->authorize('export', PayrollRecord::class);

        $month = $request->month();

        $recordsQuery = PayrollRecord::query()
            ->with(['user', 'employee'])
            ->where('month', $month);

        if ($request->employeeId()) {
            $recordsQuery->where('employee_id', $request->employeeId());
        }

        if ($request->branchId()) {
            $recordsQuery->whereHas('employee', fn ($q) => $q->where('branch_id', $request->branchId()));
        }

        $records = $recordsQuery->orderBy('user_id')->get();

        $filename = 'payroll-'.$month.'.csv';

        return response()->streamDownload(function () use ($records): void {
            $out = fopen('php://output', 'w');

            fputcsv($out, [
                'user_id',
                'employee_id',
                'email',
                'month',
                'total_work_days',
                'total_late_minutes',
                'total_overtime_minutes',
                'deduction_amount',
            ]);

            foreach ($records as $r) {
                fputcsv($out, [
                    $r->user_id,
                    $r->employee_id,
                    $r->user?->email,
                    $r->month,
                    $r->total_work_days,
                    $r->total_late_minutes,
                    $r->total_overtime_minutes,
                    (string) $r->deduction_amount,
                ]);
            }

            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv',
        ]);
    }

    private function resolveTargetUser(int $userId, ?int $employeeId): User
    {
        if ($employeeId) {
            $employeeUserId = Employee::query()->where('id', $employeeId)->value('user_id');

            if (!$employeeUserId) {
                throw new \Symfony\Component\HttpKernel\Exception\HttpException(422, 'Employee is not linked to a user.');
            }

            return User::query()->findOrFail((int) $employeeUserId);
        }

        return User::query()->findOrFail($userId);
    }
}
