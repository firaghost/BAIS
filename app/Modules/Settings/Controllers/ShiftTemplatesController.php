<?php

declare(strict_types=1);

namespace App\Modules\Settings\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Settings\Models\ShiftTemplate;
use App\Modules\Settings\Requests\ShiftTemplateStoreRequest;
use App\Modules\Settings\Requests\ShiftTemplateUpdateRequest;
use App\Modules\Settings\Requests\UpdateShiftDefaultsRequest;
use App\Modules\Settings\Services\ShiftTemplatesService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShiftTemplatesController extends Controller
{
    public function __construct(private readonly ShiftTemplatesService $service)
    {
    }

    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->list()]);
    }

    public function store(ShiftTemplateStoreRequest $request): JsonResponse
    {
        $created = $this->service->create($request->payload());

        return response()->json(['data' => $created], 201);
    }

    public function update(ShiftTemplateUpdateRequest $request, ShiftTemplate $shiftTemplate): JsonResponse
    {
        $updated = $this->service->update($shiftTemplate, $request->payload());

        return response()->json(['data' => $updated]);
    }

    public function destroy(Request $request, ShiftTemplate $shiftTemplate): JsonResponse
    {
        $this->service->archive($shiftTemplate);

        return response()->json(['ok' => true]);
    }

    public function defaultsShow(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->getDefaults()]);
    }

    public function defaultsUpdate(UpdateShiftDefaultsRequest $request): JsonResponse
    {
        $updated = $this->service->updateDefaults($request->payload());

        return response()->json(['data' => $updated]);
    }
}
