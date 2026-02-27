<?php

declare(strict_types=1);

namespace App\Modules\Settings\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Settings\Models\ApiKey;
use App\Modules\Settings\Requests\CreateApiKeyRequest;
use App\Modules\Settings\Requests\UpdateWebhookConfigRequest;
use App\Modules\Settings\Services\ApiIntegrationsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ApiIntegrationsController extends Controller
{
    public function __construct(private readonly ApiIntegrationsService $service)
    {
    }

    public function keysIndex(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->listKeys()]);
    }

    public function keysCreate(CreateApiKeyRequest $request): JsonResponse
    {
        $created = $this->service->createKey($request->user(), $request->name());

        return response()->json(['data' => $created], 201);
    }

    public function keysRegenerate(Request $request, ApiKey $apiKey): JsonResponse
    {
        $updated = $this->service->regenerateKey($request->user(), $apiKey);

        return response()->json(['data' => $updated]);
    }

    public function keysRevoke(Request $request, ApiKey $apiKey): JsonResponse
    {
        $this->service->revokeKey($request->user(), $apiKey);

        return response()->json(['ok' => true]);
    }

    public function webhookShow(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->getWebhookConfig()]);
    }

    public function webhookUpdate(UpdateWebhookConfigRequest $request): JsonResponse
    {
        $updated = $this->service->updateWebhookConfig($request->payload());

        return response()->json(['data' => $updated]);
    }

    public function webhookTest(Request $request): JsonResponse
    {
        $result = $this->service->testWebhookConnection();

        return response()->json(['data' => $result]);
    }
}
