<?php

declare(strict_types=1);

namespace App\Modules\Employees\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Employees\Models\Employee;
use App\Modules\Employees\Requests\EmployeePhotoUploadRequest;
use App\Modules\Employees\Requests\EmployeeProvisionUserRequest;
use App\Modules\Employees\Requests\EmployeeStoreRequest;
use App\Modules\Employees\Requests\EmployeeUpdateRequest;
use App\Modules\Employees\Services\EmployeeProvisioningService;
use App\Modules\Employees\Services\EmployeeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployeeController extends Controller
{
    public function __construct(
        private readonly EmployeeService $employeeService,
        private readonly EmployeeProvisioningService $provisioningService,
    )
    {
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Employee::class);

        $query = Employee::query()
            ->with(['branch', 'user'])
            ->orderBy('last_name')
            ->orderBy('first_name');

        if (is_string($request->query('q')) && $request->query('q') !== '') {
            $q = (string) $request->query('q');
            $query->where(function ($sub) use ($q): void {
                $sub->where('employee_code', 'like', '%'.$q.'%')
                    ->orWhere('first_name', 'like', '%'.$q.'%')
                    ->orWhere('middle_name', 'like', '%'.$q.'%')
                    ->orWhere('last_name', 'like', '%'.$q.'%');
            });
        }

        return response()->json(['data' => $query->paginate(20)]);
    }

    public function store(EmployeeStoreRequest $request): JsonResponse
    {
        $this->authorize('create', Employee::class);

        $created = $this->employeeService->create($request->user(), $request->payload(), $request->ip());

        return response()->json(['data' => $created], 201);
    }

    public function update(EmployeeUpdateRequest $request, Employee $employee): JsonResponse
    {
        $this->authorize('update', $employee);

        $updated = $this->employeeService->update($request->user(), $employee, $request->payload(), $request->ip());

        return response()->json(['data' => $updated]);
    }

    public function uploadPhoto(EmployeePhotoUploadRequest $request, Employee $employee): JsonResponse
    {
        $this->authorize('update', $employee);

        $updated = $this->employeeService->uploadPhoto(
            $request->user(),
            $employee,
            $request->file('photo'),
            $request->ip(),
        );

        return response()->json(['data' => $updated]);
    }

    public function provisionUser(EmployeeProvisionUserRequest $request, Employee $employee): JsonResponse
    {
        $this->authorize('update', $employee);

        $user = $this->provisioningService->provisionUser(
            $request->user(),
            $employee,
            $request->email(),
            $request->name(),
            $request->ip(),
        );

        return response()->json([
            'data' => [
                'user' => $user,
                'default_password' => EmployeeProvisioningService::DEFAULT_PASSWORD,
                'must_change_password' => (bool) $user->must_change_password,
            ],
        ]);
    }
}
