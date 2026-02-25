<?php

declare(strict_types=1);

namespace App\Modules\Branches\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Branches\Models\Branch;
use App\Modules\Branches\Requests\BranchStoreRequest;
use App\Modules\Branches\Requests\BranchUpdateRequest;
use App\Modules\Branches\Services\BranchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BranchController extends Controller
{
    public function __construct(private readonly BranchService $branchService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Branch::class);

        $branches = Branch::query()
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $branches]);
    }

    public function store(BranchStoreRequest $request): JsonResponse
    {
        $this->authorize('create', Branch::class);

        $created = $this->branchService->create($request->payload());

        return response()->json(['data' => $created], 201);
    }

    public function update(BranchUpdateRequest $request, Branch $branch): JsonResponse
    {
        $this->authorize('update', $branch);

        $updated = $this->branchService->update($branch, $request->payload());

        return response()->json(['data' => $updated]);
    }

    public function destroy(Request $request, Branch $branch): JsonResponse
    {
        $this->authorize('delete', $branch);

        $this->branchService->delete($branch);

        return response()->json(['status' => 'ok']);
    }
}
