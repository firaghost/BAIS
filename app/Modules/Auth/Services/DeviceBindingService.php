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
        if (!$employeeId) {
            return;
        }

        // Check if this exact device identifier is already registered in the DB
        $existingDevice = Device::query()
            ->where('device_identifier', $deviceIdentifier)
            ->first();

        // If the device is already in the DB for THIS employee, let him login
        if ($existingDevice && $existingDevice->user_id === $user->id) {
            // Ensure it is the active device
            if (!$existingDevice->is_active) {
                $this->db->transaction(function () use ($user, $existingDevice): void {
                    // Deactivate others
                    Device::query()
                        ->where('user_id', $user->id)
                        ->where('is_active', true)
                        ->update(['is_active' => false]);
                    
                    // Activate this one
                    $existingDevice->update(['is_active' => true]);
                });
            }
            return;
        }

        // If it belongs to someone else, reject
        if ($existingDevice && $existingDevice->user_id !== $user->id) {
            throw new AuthenticationException('This device is already registered to another account. Please use a different device or contact support.');
        }

        // If the device is NEW (not in the DB), check if employee already has an active device
        $activeDevice = Device::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->first();

        // If they don't have an active device, bind this new one
        if (!$activeDevice) {
            $this->db->transaction(function () use ($user, $employeeId, $deviceIdentifier, $deviceName, $ipAddress): void {
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

        // They already have a different active device bound
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

        throw new AuthenticationException('Your account is already registered on another device. Please use your registered device or contact an administrator to reset your device.');
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
