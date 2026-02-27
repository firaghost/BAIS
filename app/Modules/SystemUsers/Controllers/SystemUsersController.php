<?php

declare(strict_types=1);

namespace App\Modules\SystemUsers\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\SystemUsers\Requests\SystemUserStoreRequest;
use App\Modules\SystemUsers\Requests\SystemUserUpdateRequest;
use App\Modules\SystemUsers\Services\SystemUsersService;
use Illuminate\Http\JsonResponse;

class SystemUsersController extends Controller
{
    public function __construct(private readonly SystemUsersService $systemUsersService)
    {
    }

    public function index(\Illuminate\Http\Request $request): JsonResponse
    {
        $page = is_numeric($request->query('page')) ? (int) $request->query('page') : 1;
        $perPage = is_numeric($request->query('per_page')) ? (int) $request->query('per_page') : 10;
        $search = is_string($request->query('search')) ? trim((string) $request->query('search')) : '';
        $roleId = is_numeric($request->query('role_id')) ? (int) $request->query('role_id') : null;

        $result = $this->systemUsersService->listUsers(
            $search,
            $roleId,
            $page,
            $perPage,
        );

        return response()->json($result);
    }

    public function rolesIndex(\Illuminate\Http\Request $request): JsonResponse
    {
        return response()->json(['data' => $this->systemUsersService->listRoles()]);
    }

    public function store(SystemUserStoreRequest $request): JsonResponse
    {
        $created = $this->systemUsersService->createUser(
            $request->user(),
            $request->payload(),
            $request->ip(),
        );

        return response()->json(['data' => $created], 201);
    }

    public function update(SystemUserUpdateRequest $request, User $user): JsonResponse
    {
        if ($request->user()?->id === $user->id) {
            return response()->json(['message' => 'You cannot edit your own system access from here.'], 422);
        }

        $updated = $this->systemUsersService->updateUser(
            $request->user(),
            $user,
            $request->payload(),
            $request->ip(),
        );

        return response()->json(['data' => $updated]);
    }

    public function deactivate(\Illuminate\Http\Request $request, User $user): JsonResponse
    {
        if ($request->user()?->id === $user->id) {
            return response()->json(['message' => 'You cannot deactivate your own account.'], 422);
        }

        $this->systemUsersService->setActive($request->user(), $user, false, $request->ip());

        return response()->json(['status' => 'ok']);
    }

    public function activate(\Illuminate\Http\Request $request, User $user): JsonResponse
    {
        $this->systemUsersService->setActive($request->user(), $user, true, $request->ip());

        return response()->json(['status' => 'ok']);
    }
}
