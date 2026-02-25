<?php

declare(strict_types=1);

namespace App\Modules\Shifts\Policies;

use App\Models\User;
use App\Modules\Shifts\Models\Shift;

class ShiftPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('shifts.view');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('shifts.manage');
    }

    public function update(User $user, Shift $shift): bool
    {
        return $user->hasPermission('shifts.manage');
    }

    public function delete(User $user, Shift $shift): bool
    {
        return $user->hasPermission('shifts.manage');
    }
}
