<?php

declare(strict_types=1);

namespace App\Modules\Auth\Services;

use App\Models\User;
use App\Modules\Audit\Services\AuditWriterService;
use App\Modules\Auth\Models\Device;
use App\Modules\Employees\Models\Employee;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\DatabaseManager;
use Symfony\Component\HttpKernel\Exception\HttpException;

class DeviceBindingService
{
    public function __construct(
        private readonly DatabaseManager $db,
        private readonly AuditWriterService $auditWriter,
    ) {
    }

    public function validateOrBind(User $user, string $deviceIdentifier, ?string $deviceName, ?string $ipAddress): void
    {
        $deviceIdentifier = trim($deviceIdentifier);

        if ($deviceIdentifier === '') {
            throw new AuthenticationException('Device identifier is required.');
        }

        $employeeId = Employee::query()->where('user_id', $user->id)->value('id');

        $activeDevice = Device::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->first();

        if (!$activeDevice) {
            $this->db->transaction(function () use ($user, $employeeId, $deviceIdentifier, $deviceName, $ipAddress): void {
                Device::query()
                    ->where('user_id', $user->id)
                    ->where('is_active', true)
                    ->update(['is_active' => false]);

                $created = Device::query()->create([
                    'user_id' => $user->id,
                    'employee_id' => $employeeId,
                    'device_identifier' => $deviceIdentifier,
                    'device_name' => $deviceName,
                    'is_active' => true,
                ]);

                $this->auditWriter->log(
                    $user->id,
                    'device.bound_first_login',
                    Device::class,
                    $created->id,
                    null,
                    [
                        'device_identifier' => $deviceIdentifier,
                        'device_name' => $deviceName,
                    ],
                    $ipAddress,
                );
            });

            return;
        }

        if (hash_equals((string) $activeDevice->device_identifier, $deviceIdentifier)) {
            return;
        }

        if ($user->hasRole('super-admin')) {
            $conflict = Device::query()
                ->where('device_identifier', $deviceIdentifier)
                ->where('user_id', '!=', $user->id)
                ->exists();

            if ($conflict) {
                throw new AuthenticationException('Login rejected: device identifier is already registered.');
            }

            $this->db->transaction(function () use ($user, $employeeId, $deviceIdentifier, $deviceName, $ipAddress, $activeDevice): void {
                Device::query()
                    ->where('user_id', $user->id)
                    ->where('is_active', true)
                    ->update(['is_active' => false]);

                $created = Device::query()->create([
                    'user_id' => $user->id,
                    'employee_id' => $employeeId,
                    'device_identifier' => $deviceIdentifier,
                    'device_name' => $deviceName,
                    'is_active' => true,
                ]);

                $this->auditWriter->log(
                    $user->id,
                    'device.bound_superadmin',
                    Device::class,
                    $created->id,
                    [
                        'previous_device_identifier' => (string) $activeDevice->device_identifier,
                    ],
                    [
                        'device_identifier' => $deviceIdentifier,
                        'device_name' => $deviceName,
                    ],
                    $ipAddress,
                );
            });

            return;
        }

        $this->auditWriter->log(
            $user->id,
            'device.login_rejected',
            Device::class,
            $activeDevice->id,
            [
                'expected_device_identifier' => (string) $activeDevice->device_identifier,
            ],
            [
                'attempt_device_identifier' => $deviceIdentifier,
                'attempt_device_name' => $deviceName,
            ],
            $ipAddress,
        );

        throw new AuthenticationException('Login rejected: unregistered device.');
    }

    public function overrideBind(
        User $actor,
        int $targetUserId,
        string $deviceIdentifier,
        ?string $deviceName,
        string $reason,
        ?string $ipAddress,
    ): void {
        $deviceIdentifier = trim($deviceIdentifier);
        $reason = trim($reason);

        if ($deviceIdentifier === '' || $reason === '') {
            throw new HttpException(422, 'Invalid request.');
        }

        $targetUser = User::query()->findOrFail($targetUserId);

        $employeeId = Employee::query()->where('user_id', $targetUser->id)->value('id');

        $conflict = Device::query()
            ->where('device_identifier', $deviceIdentifier)
            ->where('user_id', '!=', $targetUser->id)
            ->exists();

        if ($conflict) {
            throw new HttpException(409, 'Device identifier is already registered.');
        }

        $this->db->transaction(function () use ($actor, $targetUser, $deviceIdentifier, $deviceName, $reason, $ipAddress): void {
            $oldActive = Device::query()
                ->where('user_id', $targetUser->id)
                ->where('is_active', true)
                ->first();

            Device::query()
                ->where('user_id', $targetUser->id)
                ->where('is_active', true)
                ->update(['is_active' => false]);

            $created = Device::query()->create([
                'user_id' => $targetUser->id,
                'employee_id' => $employeeId,
                'device_identifier' => $deviceIdentifier,
                'device_name' => $deviceName,
                'is_active' => true,
            ]);

            $this->auditWriter->log(
                $actor->id,
                'device.override',
                Device::class,
                $created->id,
                [
                    'target_user_id' => $targetUser->id,
                    'old_device_identifier' => $oldActive?->device_identifier,
                    'old_device_name' => $oldActive?->device_name,
                ],
                [
                    'target_user_id' => $targetUser->id,
                    'device_identifier' => $deviceIdentifier,
                    'device_name' => $deviceName,
                    'reason' => $reason,
                ],
                $ipAddress,
            );
        });
    }
}
