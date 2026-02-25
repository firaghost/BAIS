<?php

declare(strict_types=1);

namespace App\Modules\Users\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Roles\Models\Role;
use App\Modules\Users\Requests\UserRoleAssignRequest;
use App\Modules\Users\Services\UserRoleService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class UserRoleController extends Controller
{
    public function __construct(private readonly UserRoleService $userRoleService)
    {
    }

    public function assign(UserRoleAssignRequest $request, User $user): JsonResponse
    {
        $this->authorize('manageRoles', $user);

        $role = Role::query()->findOrFail($request->roleId());

        $this->userRoleService->assignRole($request->user(), $user, $role, $request->ip());

        return response()->json(['status' => 'ok']);
    }

    public function remove(Request $request, User $user, int $roleId): JsonResponse
    {
        $this->authorize('manageRoles', $user);

        $role = Role::query()->findOrFail($roleId);

        $this->userRoleService->removeRole($request->user(), $user, $role, $request->ip());

        return response()->json(['status' => 'ok']);
    }
}
