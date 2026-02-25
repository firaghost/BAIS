<?php

declare(strict_types=1);

namespace App\Modules\Shifts\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Shifts\Models\Shift;
use App\Modules\Shifts\Requests\ShiftStoreRequest;
use App\Modules\Shifts\Requests\ShiftUpdateRequest;
use App\Modules\Shifts\Services\ShiftService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShiftController extends Controller
{
    public function __construct(private readonly ShiftService $shiftService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Shift::class);

        $shifts = Shift::query()
            ->with('branch')
            ->orderBy('branch_id')
            ->orderBy('start_time')
            ->get();

        return response()->json(['data' => $shifts]);
    }

    public function store(ShiftStoreRequest $request): JsonResponse
    {
        $this->authorize('create', Shift::class);

        $created = $this->shiftService->create($request->payload());

        return response()->json(['data' => $created], 201);
    }

    public function update(ShiftUpdateRequest $request, Shift $shift): JsonResponse
    {
        $this->authorize('update', $shift);

        $updated = $this->shiftService->update($shift, $request->payload());

        return response()->json(['data' => $updated]);
    }

    public function destroy(Request $request, Shift $shift): JsonResponse
    {
        $this->authorize('delete', $shift);

        $this->shiftService->delete($shift);

        return response()->json(['status' => 'ok']);
    }
}
