<?php

declare(strict_types=1);

namespace App\Modules\Settings\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Settings\Requests\UpdateSecurityPoliciesRequest;
use App\Modules\Settings\Services\SystemSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SecurityPoliciesController extends Controller
{
    public function __construct(private readonly SystemSettingsService $service)
    {
    }

    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->service->getSecurityPolicies(),
        ]);
    }

    public function update(UpdateSecurityPoliciesRequest $request): JsonResponse
    {
        $updated = $this->service->updateSecurityPolicies($request->payload());

        return response()->json([
            'data' => $updated,
        ]);
    }
}
