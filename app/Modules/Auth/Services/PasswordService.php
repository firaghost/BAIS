<?php

declare(strict_types=1);

namespace App\Modules\Auth\Services;

use App\Models\User;
use App\Modules\Audit\Services\AuditWriterService;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\DatabaseManager;
use Illuminate\Support\Facades\Hash;

class PasswordService
{
    public function __construct(
        private readonly DatabaseManager $db,
        private readonly AuditWriterService $auditWriter,
    ) {
    }

    public function changePassword(User $actor, ?string $currentPassword, string $newPassword, ?string $ipAddress): void
    {
        $this->db->transaction(function () use ($actor, $currentPassword, $newPassword, $ipAddress): void {
            if (is_string($currentPassword) && $currentPassword !== '') {
                if (!Hash::check($currentPassword, (string) $actor->password)) {
                    throw new AuthenticationException('Current password is incorrect.');
                }
            }

            User::query()
                ->whereKey($actor->id)
                ->update([
                    'password' => Hash::make($newPassword),
                    'must_change_password' => false,
                ]);

            $this->auditWriter->log(
                $actor->id,
                'auth.password_changed',
                User::class,
                $actor->id,
                null,
                ['must_change_password' => false],
                $ipAddress,
            );
        });
    }
}
