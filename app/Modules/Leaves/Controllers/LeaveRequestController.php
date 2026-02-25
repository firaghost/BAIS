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

        $query = LeaveRequest::query()
            ->with(['user', 'approver', 'managerApprover', 'hrApprover'])
            ->orderByDesc('created_at');

        if ($request->user()->hasPermission('leaves.manage')) {
            // All requests
        } elseif ($request->user()->hasPermission('leaves.approve')) {
            $stage = $request->user()->hasRole('hr-admin') ? 'pending_hr' : 'pending';

            $query->where('user_id', $request->user()->id)
                ->orWhere('status', $stage);
        } else {
            $query->where('user_id', $request->user()->id);
        }

        return response()->json(['data' => $query->paginate(20)]);
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

        $balances = [
            'annual' => $this->leaveService->calculateBalance($user, 'annual', $year),
            'sick' => $this->leaveService->calculateBalance($user, 'sick', $year),
            'personal' => $this->leaveService->calculateBalance($user, 'personal', $year),
        ];

        return response()->json(['data' => $balances]);
    }
}
