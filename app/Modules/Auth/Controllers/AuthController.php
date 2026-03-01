<?php

declare(strict_types=1);

namespace App\Modules\Auth\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Auth\AuthenticationException;
use App\Modules\Auth\Requests\ChangePasswordRequest;
use App\Modules\Auth\Requests\LoginRequest;
use App\Modules\Auth\Services\AuthService;
use App\Modules\Auth\Services\PasswordService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AuthController extends Controller
{
    public function __construct(
        private readonly AuthService $authService,
        private readonly PasswordService $passwordService,
    )
    {
    }

    public function me(): JsonResponse
    {
        $user = request()->user();

        if (!$user) {
            throw new AuthenticationException('Unauthenticated.');
        }

        $roles = $user->roles()->pluck('slug')->values();
        $isSuperAdmin = $roles->contains('super-admin');
        $permissions = [];

        if (!$isSuperAdmin) {
            $permissions = DB::table('permissions')
                ->join('role_permission', 'role_permission.permission_id', '=', 'permissions.id')
                ->join('user_role', 'user_role.role_id', '=', 'role_permission.role_id')
                ->where('user_role.user_id', $user->id)
                ->pluck('permissions.slug')
                ->values()
                ->all();
        }

        return response()->json([
            'user' => $user,
            'roles' => $roles,
            'permissions' => $permissions,
        ]);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        try {
            $result = $this->authService->login(
                $request->loginIdentifier(),
                $request->password(),
                $request->deviceName(),
                $request->deviceIdentifier(),
                $request->ip(),
            );
        } catch (AuthenticationException $e) {
            return response()->json([
                'message' => $e->getMessage() !== '' ? $e->getMessage() : 'Unauthorized',
            ], 401);
        }

        $user = $result['user'];
        $user->load('employee');

        return response()->json([
            'token' => $result['token'],
            'user' => $user,
            'must_change_password' => (bool) ($user->must_change_password ?? false),
        ]);
    }

    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $this->passwordService->changePassword(
            $request->user(),
            $request->currentPassword(),
            $request->newPassword(),
            $request->ip(),
        );

        return response()->json(['status' => 'ok']);
    }
}
