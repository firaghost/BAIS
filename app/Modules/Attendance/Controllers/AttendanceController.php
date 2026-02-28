<?php

declare(strict_types=1);

namespace App\Modules\Attendance\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Attendance\Models\AttendanceLog;
use App\Modules\Attendance\Requests\AttendanceCheckInRequest;
use App\Modules\Attendance\Requests\AttendanceCheckOutRequest;
use App\Modules\Attendance\Requests\AttendanceHistoryRequest;
use App\Modules\Attendance\Requests\AttendanceManageIndexRequest;
use App\Modules\Attendance\Requests\AttendanceManageUpdateRequest;
use App\Modules\Attendance\Services\AttendanceService;
use App\Modules\Settings\Services\SystemSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Support\Carbon;

class AttendanceController extends Controller
{
    public function __construct(
        private readonly AttendanceService $attendanceService,
        private readonly SystemSettingsService $systemSettings,
    )
    {
    }

    public function checkIn(AttendanceCheckInRequest $request): JsonResponse
    {
        $actor = $request->user();

        if (!$actor) {
            throw new AuthenticationException('Unauthenticated.');
        }

        $created = $this->attendanceService->checkIn(
            $actor,
            $request->latitude(),
            $request->longitude(),
        );

        $created->load(['branch', 'employee']);

        return response()->json(['data' => $created], 201);
    }

    public function headOfficeGeo(): JsonResponse
    {
        return response()->json([
            'data' => $this->systemSettings->getHeadOfficeGeoFence(),
        ]);
    }

    public function checkOut(AttendanceCheckOutRequest $request): JsonResponse
    {
        $actor = $request->user();

        if (!$actor) {
            throw new AuthenticationException('Unauthenticated.');
        }

        $updated = $this->attendanceService->checkOut($actor);
        $updated->load(['branch', 'employee']);

        return response()->json(['data' => $updated]);
    }

    public function today(): JsonResponse
    {
        $actor = request()->user();

        if (! $actor) {
            throw new AuthenticationException('Unauthenticated.');
        }

        $today = Carbon::today()->toDateString();

        // Order by check_in_time DESC so we always get the most recent check-in
        // for today. Using ->latest() was wrong — it orders by `created_at`
        // which may differ from `check_in_time` after admin corrections.
        $log = AttendanceLog::query()
            ->with(['branch', 'employee'])
            ->where('user_id', $actor->id)
            ->whereDate('log_date', $today)
            ->orderByDesc('check_in_time')
            ->first();

        return response()->json(['data' => $log]);
    }


    public function history(AttendanceHistoryRequest $request): JsonResponse
    {
        $actor = $request->user();

        if (!$actor) {
            throw new AuthenticationException('Unauthenticated.');
        }

        $result = $this->attendanceService->history(
            $actor,
            $request->fromDate(),
            $request->toDate(),
            $request->status(),
            $request->perPage(),
        );

        return response()->json(['data' => $result]);
    }

    public function weeklySummary(): JsonResponse
    {
        $actor = request()->user();

        if (!$actor) {
            throw new AuthenticationException('Unauthenticated.');
        }

        $summary = $this->attendanceService->weeklySummary($actor);

        return response()->json(['data' => $summary]);
    }

    public function manageIndex(AttendanceManageIndexRequest $request): JsonResponse
    {
        $actor = $request->user();

        if (!$actor) {
            throw new AuthenticationException('Unauthenticated.');
        }

        $result = $this->attendanceService->manageIndex(
            $request->fromDate(),
            $request->toDate(),
            $request->status(),
            $request->userId(),
            $request->employeeId(),
            $request->perPage(),
        );

        return response()->json(['data' => $result]);
    }

    public function manageUpdate(AttendanceManageUpdateRequest $request, AttendanceLog $attendanceLog): JsonResponse
    {
        $actor = $request->user();

        if (!$actor) {
            throw new AuthenticationException('Unauthenticated.');
        }

        $updated = $this->attendanceService->manageUpdate(
            $actor,
            $attendanceLog,
            $request->payload(),
            $request->reason(),
            $request->ip(),
        );

        return response()->json(['data' => $updated]);
    }
}
