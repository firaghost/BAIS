<?php

declare(strict_types=1);

namespace App\Modules\Auth\Services;

use App\Modules\Employees\Models\Employee;
use App\Models\User;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Support\Facades\Hash;

class AuthService
{
    public function __construct(private readonly DeviceBindingService $deviceBindingService)
    {
    }

    /**
     * @return array{user: User, token: string}
     */
    public function login(string $login, string $password, string $deviceName, string $deviceIdentifier, ?string $ipAddress): array
    {
        $login = trim($login);

        if ($login === '') {
            throw new AuthenticationException('Invalid credentials.');
        }

        $user = $this->resolveUserFromLogin($login);

        if (!$user || !Hash::check($password, (string) $user->password)) {
            throw new AuthenticationException('Invalid credentials.');
        }

        $this->deviceBindingService->validateOrBind($user, $deviceIdentifier, $deviceName, $ipAddress);

        $token = $user->createToken($deviceName)->plainTextToken;

        return [
            'user' => $user,
            'token' => $token,
        ];
    }

    private function resolveUserFromLogin(string $login): ?User
    {
        $email = trim($login);
        if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return User::query()->where('email', $email)->first();
        }

        $employeeCode = $this->normalizeEmployeeCode($login);
        if ($employeeCode === null) {
            return null;
        }

        $employee = Employee::query()->where('employee_code', $employeeCode)->first();
        if (!$employee || !$employee->user_id) {
            return null;
        }

        return User::query()->find($employee->user_id);
    }

    private function normalizeEmployeeCode(string $value): ?string
    {
        $raw = strtoupper(trim($value));
        $raw = preg_replace('/[^A-Z0-9]/', '', $raw) ?? '';

        if (!str_starts_with($raw, 'SDB')) {
            return null;
        }

        if (preg_match('/^SDB(\d{3})(\d{4})$/', $raw, $m) !== 1) {
            return null;
        }

        return 'SDB-' . $m[1] . '-' . $m[2];
    }
}
