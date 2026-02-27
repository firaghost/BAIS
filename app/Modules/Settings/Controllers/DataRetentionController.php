<?php

declare(strict_types=1);

namespace App\Modules\Settings\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Settings\Requests\UpdateDataRetentionRequest;
use App\Modules\Settings\Services\SystemSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DataRetentionController extends Controller
{
    public function __construct(private readonly SystemSettingsService $service)
    {
    }

    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->service->getDataRetention(),
        ]);
    }

    public function update(UpdateDataRetentionRequest $request): JsonResponse
    {
        return response()->json([
            'data' => $this->service->updateDataRetention($request->payload()),
        ]);
    }

    public function reset(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->service->resetDataRetention(),
        ]);
    }
}
