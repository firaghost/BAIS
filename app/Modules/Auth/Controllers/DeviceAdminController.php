<?php

declare(strict_types=1);

namespace App\Modules\Auth\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Auth\Requests\DeviceOverrideRequest;
use App\Modules\Auth\Services\DeviceBindingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Auth\AuthenticationException;

class DeviceAdminController extends Controller
{
    public function __construct(private readonly DeviceBindingService $deviceBindingService)
    {
    }

    public function override(DeviceOverrideRequest $request): JsonResponse
    {
        $actor = $request->user();

        if (!$actor) {
            throw new AuthenticationException('Unauthenticated.');
        }

        $this->deviceBindingService->overrideBind(
            $actor,
            $request->targetUserId(),
            $request->deviceIdentifier(),
            $request->deviceName(),
            $request->reason(),
            $request->ip(),
        );

        return response()->json(['status' => 'ok']);
    }
}
