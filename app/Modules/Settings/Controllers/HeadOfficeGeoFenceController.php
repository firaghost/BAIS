<?php

declare(strict_types=1);

namespace App\Modules\Settings\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Settings\Requests\UpdateHeadOfficeGeoFenceRequest;
use App\Modules\Settings\Services\SystemSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HeadOfficeGeoFenceController extends Controller
{
    public function __construct(private readonly SystemSettingsService $service)
    {
    }

    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->service->getHeadOfficeGeoFence(),
        ]);
    }

    public function update(UpdateHeadOfficeGeoFenceRequest $request): JsonResponse
    {
        $updated = $this->service->updateHeadOfficeGeoFence($request->payload());

        return response()->json([
            'data' => $updated,
        ]);
    }
}
