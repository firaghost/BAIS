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
use Illuminate\Support\Facades\DB;

class BranchController extends Controller
{
    public function __construct(private readonly BranchService $branchService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Branch::class);

        $search = is_string($request->query('search')) ? trim((string) $request->query('search')) : '';
        $sort = is_string($request->query('sort')) ? (string) $request->query('sort') : 'name';
        $radiusMin = is_numeric($request->query('radius_min')) ? (int) $request->query('radius_min') : null;
        $radiusMax = is_numeric($request->query('radius_max')) ? (int) $request->query('radius_max') : null;
        $page = (int) $request->query('page', 0);
        $perPage = (int) $request->query('per_page', 0);

        $shouldPaginate = $page > 0 || $perPage > 0 || $search !== '' || $sort !== 'name';

        if (!$shouldPaginate) {
            $branches = Branch::query()
                ->leftJoin('employees', 'employees.branch_id', '=', 'branches.id')
                ->leftJoin('devices', 'devices.employee_id', '=', 'employees.id')
                ->leftJoin('employees as manager', 'manager.id', '=', 'branches.manager_employee_id')
                ->select([
                    'branches.id',
                    'branches.branch_code',
                    'branches.name',
                    'branches.address_line',
                    'branches.city',
                    'branches.state',
                    'branches.manager_employee_id',
                    DB::raw('CONCAT(manager.first_name, " ", manager.last_name) as manager_name'),
                    'branches.latitude',
                    'branches.longitude',
                    'branches.radius_meters',
                    DB::raw('COUNT(devices.id) as total_devices'),
                    DB::raw('SUM(CASE WHEN devices.is_active = 1 THEN 1 ELSE 0 END) as active_devices'),
                ])
                ->groupBy([
                    'branches.id',
                    'branches.branch_code',
                    'branches.name',
                    'branches.address_line',
                    'branches.city',
                    'branches.state',
                    'branches.manager_employee_id',
                    'manager.first_name',
                    'manager.last_name',
                    'branches.latitude',
                    'branches.longitude',
                    'branches.radius_meters',
                ])
                ->orderBy('branches.name')
                ->get();

            return response()->json(['data' => $branches]);
        }

        $page = $page > 0 ? $page : 1;
        $perPage = $perPage > 0 && $perPage <= 100 ? $perPage : 6;

        $query = Branch::query()
            ->leftJoin('employees', 'employees.branch_id', '=', 'branches.id')
            ->leftJoin('devices', 'devices.employee_id', '=', 'employees.id')
            ->leftJoin('employees as manager', 'manager.id', '=', 'branches.manager_employee_id')
            ->select([
                'branches.id',
                'branches.branch_code',
                'branches.name',
                'branches.address_line',
                'branches.city',
                'branches.state',
                'branches.manager_employee_id',
                DB::raw('CONCAT(manager.first_name, " ", manager.last_name) as manager_name'),
                'branches.latitude',
                'branches.longitude',
                'branches.radius_meters',
                DB::raw('COUNT(devices.id) as total_devices'),
                DB::raw('SUM(CASE WHEN devices.is_active = 1 THEN 1 ELSE 0 END) as active_devices'),
            ])
            ->groupBy([
                'branches.id',
                'branches.branch_code',
                'branches.name',
                'branches.address_line',
                'branches.city',
                'branches.state',
                'branches.manager_employee_id',
                'manager.first_name',
                'manager.last_name',
                'branches.latitude',
                'branches.longitude',
                'branches.radius_meters',
            ]);

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('branches.name', 'like', '%'.$search.'%')
                  ->orWhere('branches.branch_code', 'like', '%'.$search.'%')
                  ->orWhere('branches.address_line', 'like', '%'.$search.'%')
                  ->orWhere('branches.city', 'like', '%'.$search.'%')
                  ->orWhere('branches.state', 'like', '%'.$search.'%');
            });
        }

        if ($radiusMin !== null) {
            $query->where('branches.radius_meters', '>=', $radiusMin);
        }

        if ($radiusMax !== null) {
            $query->where('branches.radius_meters', '<=', $radiusMax);
        }

        $sortOptions = [
            'name' => ['branches.name', 'asc'],
            'radius' => ['branches.radius_meters', 'desc'],
            'devices' => ['total_devices', 'desc'],
        ];

        [$field, $dir] = $sortOptions[$sort] ?? $sortOptions['name'];
        $query->orderBy($field, $dir);

        $paginator = $query->paginate($perPage, ['*'], 'page', $page);

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
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
