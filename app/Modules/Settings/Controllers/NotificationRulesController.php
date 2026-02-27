<?php

declare(strict_types=1);

namespace App\Modules\Settings\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Settings\Requests\UpdateNotificationRulesRequest;
use App\Modules\Settings\Services\SystemSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationRulesController extends Controller
{
    public function __construct(private readonly SystemSettingsService $service)
    {
    }

    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->service->getNotificationRules(),
        ]);
    }

    public function update(UpdateNotificationRulesRequest $request): JsonResponse
    {
        return response()->json([
            'data' => $this->service->updateNotificationRules($request->payload()),
        ]);
    }

    public function reset(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->service->resetNotificationRules(),
        ]);
    }
}
