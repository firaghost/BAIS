<?php

declare(strict_types=1);

namespace App\Modules\Leaves\Services;

use App\Models\User;
use App\Modules\Audit\Services\AuditWriterService;
use App\Modules\Employees\Models\Employee;
use App\Modules\Leaves\Models\LeaveCredit;
use App\Modules\Leaves\Models\LeaveRequest;
use Carbon\Carbon;
use Illuminate\Database\DatabaseManager;

class LeaveRequestService
{
    private const DEFAULT_ALLOWANCE = [
        'annual' => 21,
        'sick' => 10,
        'personal' => 5,
        'other' => 0,
    ];

    public function __construct(
        private readonly DatabaseManager $db,
        private readonly AuditWriterService $auditWriter,
    ) {
    }

    private function ensureCreditsExistForYear(int $employeeId, int $year): void
    {
        $types = ['annual', 'sick', 'personal', 'other'];

        foreach ($types as $type) {
            LeaveCredit::query()->firstOrCreate(
                [
                    'employee_id' => $employeeId,
                    'year' => $year,
                    'leave_type' => $type,
                ],
                [
                    'total_days' => self::DEFAULT_ALLOWANCE[$type] ?? 0,
                    'used_days' => 0,
                ],
            );
        }
    }

    private function deductCreditsForApproval(LeaveRequest $request, User $approver): void
    {
        if (!$request->employee_id) {
            return;
        }

        $days = $request->start_date->diffInDays($request->end_date) + 1;
        $year = (int) $request->start_date->year;

        $this->ensureCreditsExistForYear($request->employee_id, $year);

        $credit = LeaveCredit::query()
            ->where('employee_id', $request->employee_id)
            ->where('year', $year)
            ->where('leave_type', $request->leave_type)
            ->lockForUpdate()
            ->first();

        if (!$credit) {
            throw new \Symfony\Component\HttpKernel\Exception\HttpException(409, 'Leave credit is not configured.');
        }

        if ($credit->remainingDays() < $days) {
            throw new \Symfony\Component\HttpKernel\Exception\HttpException(409, 'Insufficient leave balance.');
        }

        $before = ['used_days' => $credit->used_days, 'total_days' => $credit->total_days];
        $credit->used_days = $credit->used_days + $days;
        $credit->save();

        $this->auditWriter->log(
            $approver->id,
            'leave.credit.deducted',
            LeaveCredit::class,
            $credit->id,
            $before,
            [
                'used_days' => $credit->used_days,
                'total_days' => $credit->total_days,
                'leave_request_id' => $request->id,
                'deducted_days' => $days,
            ],
            null,
        );
    }

    public function createRequest(User $user, array $data): LeaveRequest
    {
        return $this->db->transaction(function () use ($user, $data): LeaveRequest {
            $employeeId = Employee::query()
                ->where('user_id', $user->id)
                ->value('id');

            $request = LeaveRequest::query()->create([
                'user_id' => $user->id,
                'employee_id' => $employeeId,
                'leave_type' => $data['leave_type'],
                'start_date' => $data['start_date'],
                'end_date' => $data['end_date'],
                'status' => 'pending',
                'reason' => $data['reason'] ?? null,
            ]);

            $this->auditWriter->log(
                $user->id,
                'leave.request.created',
                LeaveRequest::class,
                $request->id,
                null,
                [
                    'leave_type' => $request->leave_type,
                    'start_date' => $request->start_date->toDateString(),
                    'end_date' => $request->end_date->toDateString(),
                    'reason' => $request->reason,
                ],
                null,
            );

            return $request;
        });
    }

    public function approve(LeaveRequest $request, User $approver): LeaveRequest
    {
        return $this->db->transaction(function () use ($request, $approver): LeaveRequest {
            $request->refresh();

            $oldStatus = $request->status;

            if ($oldStatus === 'pending') {
                $request->status = 'pending_hr';
                $request->manager_approved_by = $approver->id;
                $request->manager_approved_at = now();
                $request->approved_by = $approver->id;
                $request->save();

                $this->auditWriter->log(
                    $approver->id,
                    'leave.request.manager_approved',
                    LeaveRequest::class,
                    $request->id,
                    ['status' => $oldStatus],
                    ['status' => 'pending_hr', 'manager_approved_by' => $approver->id],
                    null,
                );

                return $request;
            }

            if ($oldStatus === 'pending_hr') {
                $this->deductCreditsForApproval($request, $approver);

                $request->status = 'approved';
                $request->hr_approved_by = $approver->id;
                $request->hr_approved_at = now();
                $request->approved_by = $approver->id;
                $request->save();

                $this->auditWriter->log(
                    $approver->id,
                    'leave.request.hr_approved',
                    LeaveRequest::class,
                    $request->id,
                    ['status' => $oldStatus],
                    ['status' => 'approved', 'hr_approved_by' => $approver->id],
                    null,
                );

                return $request;
            }

            throw new \Symfony\Component\HttpKernel\Exception\HttpException(409, 'Request already reviewed.');
        });
    }

    public function reject(LeaveRequest $request, User $approver, ?string $reason): LeaveRequest
    {
        return $this->db->transaction(function () use ($request, $approver, $reason): LeaveRequest {
            $request->refresh();

            $oldStatus = $request->status;

            $request->status = 'rejected';
            $request->approved_by = $approver->id;
            $request->rejection_reason = $reason;
            $request->save();

            $this->auditWriter->log(
                $approver->id,
                'leave.request.rejected',
                LeaveRequest::class,
                $request->id,
                ['status' => $oldStatus],
                ['status' => 'rejected', 'approved_by' => $approver->id, 'rejection_reason' => $reason],
                null,
            );

            return $request;
        });
    }

    public function calculateBalance(User $user, string $leaveType, int $year): int
    {
        $employeeId = Employee::query()
            ->where('user_id', $user->id)
            ->value('id');

        if (!$employeeId) {
            return 0;
        }

        $this->ensureCreditsExistForYear($employeeId, $year);

        $credit = LeaveCredit::query()
            ->where('employee_id', $employeeId)
            ->where('year', $year)
            ->where('leave_type', $leaveType)
            ->first();

        if (!$credit) {
            return 0;
        }

        return $credit->remainingDays();
    }
}
