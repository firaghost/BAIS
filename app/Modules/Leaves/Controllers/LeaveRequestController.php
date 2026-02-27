<?php

declare(strict_types=1);

namespace App\Modules\Leaves\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Leaves\Models\LeaveRequest;
use App\Modules\Leaves\Requests\LeaveRequestApproveRequest;
use App\Modules\Leaves\Requests\LeaveRequestStoreRequest;
use App\Modules\Leaves\Services\LeaveRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeaveRequestController extends Controller
{
    public function __construct(private readonly LeaveRequestService $leaveService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', LeaveRequest::class);

        $status = $request->string('status')->toString();
        $search = trim($request->string('search')->toString());
        $department = trim($request->string('department')->toString());
        $leaveType = trim($request->string('leave_type')->toString());
        $perPage = (int) $request->input('per_page', 20);
        $perPage = max(1, min(100, $perPage));
        $includeSummary = filter_var($request->input('include_summary', false), FILTER_VALIDATE_BOOL);

        $query = LeaveRequest::query()
            ->with(['user.employee', 'employee', 'approver', 'managerApprover', 'hrApprover'])
            ->orderByDesc('created_at');

        if ($request->user()->hasPermission('leaves.manage')) {
            // All requests
        } elseif ($request->user()->hasPermission('leaves.approve')) {
            // Approvers can review history.
        } else {
            $query->where('user_id', $request->user()->id);
        }

        if ($status !== '' && $status !== 'all') {
            if ($status === 'pending_review') {
                $query->whereIn('status', ['pending', 'pending_hr']);
            } else {
                $query->where('status', $status);
            }
        }

        if ($leaveType !== '' && $leaveType !== 'all') {
            $query->where('leave_type', $leaveType);
        }

        if ($department !== '' && $department !== 'all') {
            $query->whereHas('employee', fn ($q) => $q->where('department', $department));
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->whereHas('employee', function ($e) use ($search): void {
                    $e->where('first_name', 'like', "%{$search}%")
                        ->orWhere('middle_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('employee_code', 'like', "%{$search}%")
                        ->orWhere('job_title', 'like', "%{$search}%")
                        ->orWhere('department', 'like', "%{$search}%");
                })->orWhereHas('user', function ($u) use ($search): void {
                    $u->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            });
        }

        if (!$includeSummary) {
            return response()->json(['data' => $query->paginate($perPage)]);
        }

        $base = LeaveRequest::query();

        if ($request->user()->hasPermission('leaves.manage')) {
            // All requests
        } elseif ($request->user()->hasPermission('leaves.approve')) {
            // Approvers can review history.
        } else {
            $base->where('user_id', $request->user()->id);
        }

        $summaryScope = function ($q) use ($department, $leaveType, $search): void {
            if ($leaveType !== '' && $leaveType !== 'all') {
                $q->where('leave_type', $leaveType);
            }

            if ($department !== '' && $department !== 'all') {
                $q->whereHas('employee', fn ($e) => $e->where('department', $department));
            }

            if ($search !== '') {
                $q->where(function ($x) use ($search): void {
                    $x->whereHas('employee', function ($e) use ($search): void {
                        $e->where('first_name', 'like', "%{$search}%")
                            ->orWhere('middle_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('employee_code', 'like', "%{$search}%")
                            ->orWhere('job_title', 'like', "%{$search}%")
                            ->orWhere('department', 'like', "%{$search}%");
                    })->orWhereHas('user', function ($u) use ($search): void {
                        $u->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
                });
            }
        };

        $pending = (clone $base)->tap($summaryScope)->whereIn('status', ['pending', 'pending_hr'])->count();
        $rejected = (clone $base)->tap($summaryScope)->where('status', 'rejected')->count();
        $approvedThisMonth = (clone $base)
            ->tap($summaryScope)
            ->where('status', 'approved')
            ->whereYear('hr_approved_at', now()->year)
            ->whereMonth('hr_approved_at', now()->month)
            ->count();

        $today = now()->toDateString();
        $onLeaveToday = (clone $base)
            ->tap($summaryScope)
            ->where('status', 'approved')
            ->whereDate('start_date', '<=', $today)
            ->whereDate('end_date', '>=', $today)
            ->distinct('employee_id')
            ->count('employee_id');

        return response()->json([
            'data' => $query->paginate($perPage),
            'summary' => [
                'pending_review' => (int) $pending,
                'approved_this_month' => (int) $approvedThisMonth,
                'rejected' => (int) $rejected,
                'on_leave_today' => (int) $onLeaveToday,
            ],
        ]);
    }

    public function store(LeaveRequestStoreRequest $request): JsonResponse
    {
        $this->authorize('create', LeaveRequest::class);

        $created = $this->leaveService->createRequest($request->user(), $request->payload());

        return response()->json(['data' => $created], 201);
    }

    public function approve(LeaveRequestApproveRequest $request, LeaveRequest $leaveRequest): JsonResponse
    {
        $this->authorize('approve', $leaveRequest);

        $updated = $this->leaveService->approve($leaveRequest, $request->user());

        return response()->json(['data' => $updated]);
    }

    public function reject(LeaveRequestApproveRequest $request, LeaveRequest $leaveRequest): JsonResponse
    {
        $this->authorize('reject', $leaveRequest);

        $updated = $this->leaveService->reject($leaveRequest, $request->user(), $request->rejectionReason());

        return response()->json(['data' => $updated]);
    }

    public function balance(Request $request): JsonResponse
    {
        $user = $request->user();
        $year = (int) $request->input('year', now()->year);

        $annualRemaining = $this->leaveService->calculateBalance($user, 'annual', $year);
        $sickRemaining = $this->leaveService->calculateBalance($user, 'sick', $year);
        $personalRemaining = $this->leaveService->calculateBalance($user, 'personal', $year);

        $employeeId = \App\Modules\Employees\Models\Employee::query()
            ->where('user_id', $user->id)
            ->value('id');

        $totals = [
            'annual' => 0,
            'sick' => 0,
            'personal' => 0,
        ];

        $used = [
            'annual' => 0,
            'sick' => 0,
            'personal' => 0,
        ];

        if ($employeeId) {
            $rows = \App\Modules\Leaves\Models\LeaveCredit::query()
                ->where('employee_id', (int) $employeeId)
                ->where('year', $year)
                ->whereIn('leave_type', ['annual', 'sick', 'personal'])
                ->get();

            foreach ($rows as $row) {
                $type = (string) $row->leave_type;
                if (!array_key_exists($type, $totals)) {
                    continue;
                }
                $totals[$type] = (int) $row->total_days;
                $used[$type] = (int) $row->used_days;
            }
        }

        return response()->json([
            'data' => [
                // Backward compatible fields (remaining)
                'annual' => $annualRemaining,
                'sick' => $sickRemaining,
                'personal' => $personalRemaining,

                // New detailed fields
                'annual_detail' => [
                    'remaining' => $annualRemaining,
                    'total' => $totals['annual'],
                    'used' => $used['annual'],
                ],
                'sick_detail' => [
                    'remaining' => $sickRemaining,
                    'total' => $totals['sick'],
                    'used' => $used['sick'],
                ],
                'personal_detail' => [
                    'remaining' => $personalRemaining,
                    'total' => $totals['personal'],
                    'used' => $used['personal'],
                ],
            ],
        ]);
    }
}
