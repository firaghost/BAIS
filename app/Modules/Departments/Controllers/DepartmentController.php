<?php

declare(strict_types=1);

namespace App\Modules\Departments\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Departments\Models\Department;
use App\Modules\Departments\Requests\DepartmentStoreRequest;
use App\Modules\Departments\Requests\DepartmentUpdateRequest;
use App\Modules\Departments\Services\DepartmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DepartmentController extends Controller
{
    public function __construct(private readonly DepartmentService $departmentService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $q = Department::query()->orderBy('name');

        if ($request->query('active_only')) {
            $q->where('is_active', true);
        }

        return response()->json([
            'data' => $q->get(),
        ]);
    }

    public function store(DepartmentStoreRequest $request): JsonResponse
    {
        $created = $this->departmentService->create($request->payload());

        return response()->json([
            'data' => $created,
        ], 201);
    }

    public function update(DepartmentUpdateRequest $request, Department $department): JsonResponse
    {
        $updated = $this->departmentService->update($department, $request->payload());

        return response()->json([
            'data' => $updated,
        ]);
    }

    public function destroy(Request $request, Department $department): JsonResponse
    {
        $this->departmentService->delete($department);

        return response()->json(['status' => 'ok']);
    }
}
