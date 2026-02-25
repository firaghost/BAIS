<?php

declare(strict_types=1);

namespace App\Modules\Branches\Policies;

use App\Models\User;
use App\Modules\Branches\Models\Branch;

class BranchPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('branches.view');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('branches.manage');
    }

    public function update(User $user, Branch $branch): bool
    {
        return $user->hasPermission('branches.manage');
    }

    public function delete(User $user, Branch $branch): bool
    {
        return $user->hasPermission('branches.manage');
    }
}
