<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    public function manageRoles(User $actor, User $target): bool
    {
        return $actor->hasPermission('users.roles.manage');
    }
}
