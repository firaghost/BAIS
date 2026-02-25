<?php

declare(strict_types=1);

namespace App\Modules\Users\Services;

use App\Models\User;
use App\Modules\Audit\Services\AuditWriterService;
use App\Modules\Roles\Models\Role;
use Illuminate\Database\DatabaseManager;

class UserRoleService
{
    public function __construct(
        private readonly DatabaseManager $db,
        private readonly AuditWriterService $auditWriter,
    ) {
    }

    public function assignRole(User $actor, User $target, Role $role, ?string $ipAddress): void
    {
        $this->db->transaction(function () use ($actor, $target, $role, $ipAddress): void {
            $oldRoleIds = $target->roles()->pluck('roles.id')->all();

            $target->roles()->syncWithoutDetaching([$role->id]);

            $newRoleIds = $target->roles()->pluck('roles.id')->all();

            $this->auditWriter->log(
                $actor->id,
                'user_role.assigned',
                User::class,
                $target->id,
                ['role_ids' => $oldRoleIds],
                ['role_ids' => $newRoleIds, 'assigned_role_id' => $role->id],
                $ipAddress,
            );
        });
    }

    public function removeRole(User $actor, User $target, Role $role, ?string $ipAddress): void
    {
        $this->db->transaction(function () use ($actor, $target, $role, $ipAddress): void {
            $oldRoleIds = $target->roles()->pluck('roles.id')->all();

            $target->roles()->detach($role->id);

            $newRoleIds = $target->roles()->pluck('roles.id')->all();

            $this->auditWriter->log(
                $actor->id,
                'user_role.removed',
                User::class,
                $target->id,
                ['role_ids' => $oldRoleIds, 'removed_role_id' => $role->id],
                ['role_ids' => $newRoleIds],
                $ipAddress,
            );
        });
    }
}
