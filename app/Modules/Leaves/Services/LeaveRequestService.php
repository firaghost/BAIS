<?php

declare(strict_types=1);

namespace App\Modules\Leaves\Services;

use App\Models\User;
use App\Modules\Audit\Services\AuditWriterService;
use App\Modules\Employees\Models\Employee;
use App\Modules\Leaves\Models\LeaveRequest;
use Carbon\Carbon;
use Illuminate\Database\DatabaseManager;

class LeaveRequestService
{
    public function __construct(
        private readonly DatabaseManager $db,
        private readonly AuditWriterService $auditWriter,
    ) {
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
        $totalDays = LeaveRequest::query()
            ->where('user_id', $user->id)
            ->where('leave_type', $leaveType)
            ->where('status', 'approved')
            ->whereYear('start_date', $year)
            ->get()
            ->sum(fn (LeaveRequest $r): int => $r->start_date->diffInDays($r->end_date) + 1);

        $defaultAllowance = match ($leaveType) {
            'annual' => 21,
            'sick' => 10,
            'personal' => 5,
            default => 0,
        };

        return max(0, $defaultAllowance - $totalDays);
    }
}
