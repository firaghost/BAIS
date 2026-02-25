<?php

declare(strict_types=1);

namespace App\Modules\Payroll\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Payroll\Models\UserShiftSchedule;
use App\Modules\Payroll\Requests\UserShiftScheduleIndexRequest;
use App\Modules\Payroll\Requests\UserShiftScheduleStoreRequest;
use App\Modules\Payroll\Requests\UserShiftScheduleUpdateRequest;
use App\Modules\Payroll\Services\UserShiftScheduleService;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\JsonResponse;

class UserShiftScheduleController extends Controller
{
    public function __construct(private readonly UserShiftScheduleService $service)
    {
    }

    public function index(UserShiftScheduleIndexRequest $request): JsonResponse
    {
        $actor = $request->user();

        if (!$actor) {
            throw new AuthenticationException('Unauthenticated.');
        }

        $result = $this->service->index(
            $actor,
            $request->userId(),
            $request->employeeId(),
            $request->perPage(),
        );

        return response()->json(['data' => $result]);
    }

    public function store(UserShiftScheduleStoreRequest $request): JsonResponse
    {
        $actor = $request->user();

        if (!$actor) {
            throw new AuthenticationException('Unauthenticated.');
        }

        $created = $this->service->create(
            $actor,
            $request->payload(),
            $request->reason(),
            $request->ip(),
        );

        return response()->json(['data' => $created], 201);
    }

    public function update(UserShiftScheduleUpdateRequest $request, UserShiftSchedule $userShiftSchedule): JsonResponse
    {
        $actor = $request->user();

        if (!$actor) {
            throw new AuthenticationException('Unauthenticated.');
        }

        $updated = $this->service->update(
            $actor,
            $userShiftSchedule,
            $request->payload(),
            $request->reason(),
            $request->ip(),
        );

        return response()->json(['data' => $updated]);
    }

    public function destroy(UserShiftScheduleUpdateRequest $request, UserShiftSchedule $userShiftSchedule): JsonResponse
    {
        $actor = $request->user();

        if (!$actor) {
            throw new AuthenticationException('Unauthenticated.');
        }

        $this->service->delete($actor, $userShiftSchedule, $request->reason(), $request->ip());

        return response()->json(['status' => 'ok']);
    }
}
