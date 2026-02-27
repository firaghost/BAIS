<?php

declare(strict_types=1);

namespace App\Modules\Attendance\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Attendance\Models\AttendanceCorrectionRequest;
use App\Modules\Attendance\Requests\AttendanceCorrectionReviewRequest;
use App\Modules\Attendance\Requests\AttendanceCorrectionStoreRequest;
use App\Modules\Attendance\Services\AttendanceCorrectionRequestService;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AttendanceCorrectionRequestController extends Controller
{
    public function __construct(private readonly AttendanceCorrectionRequestService $service)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $actor = $request->user();

        if (!$actor) {
            throw new AuthenticationException('Unauthenticated.');
        }

        $perPage = (int) $request->query('per_page', 20);
        $perPage = max(1, min(100, $perPage));

        $result = $this->service->index($actor, $perPage);

        return response()->json(['data' => $result]);
    }

    public function store(AttendanceCorrectionStoreRequest $request): JsonResponse
    {
        $actor = $request->user();

        if (!$actor) {
            throw new AuthenticationException('Unauthenticated.');
        }

        $created = $this->service->create($actor, $request->payload(), $request->ip());

        return response()->json(['data' => $created], 201);
    }

    public function approve(
        AttendanceCorrectionReviewRequest $request,
        AttendanceCorrectionRequest $attendanceCorrectionRequest,
    ): JsonResponse {
        $actor = $request->user();

        if (!$actor) {
            throw new AuthenticationException('Unauthenticated.');
        }

        $updated = $this->service->approve(
            $attendanceCorrectionRequest,
            $actor,
            $request->comment(),
            $request->excuseLate(),
            $request->ip(),
        );

        return response()->json(['data' => $updated]);
    }

    public function reject(
        AttendanceCorrectionReviewRequest $request,
        AttendanceCorrectionRequest $attendanceCorrectionRequest,
    ): JsonResponse {
        $actor = $request->user();

        if (!$actor) {
            throw new AuthenticationException('Unauthenticated.');
        }

        $updated = $this->service->reject($attendanceCorrectionRequest, $actor, $request->comment(), $request->ip());

        return response()->json(['data' => $updated]);
    }
}
