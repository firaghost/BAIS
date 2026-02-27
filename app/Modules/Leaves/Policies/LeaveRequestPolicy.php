<?php

declare(strict_types=1);

namespace App\Modules\Leaves\Policies;

use App\Models\User;
use App\Modules\Leaves\Models\LeaveRequest;

class LeaveRequestPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('leaves.view')
            || $user->hasPermission('leaves.request')
            || $user->hasPermission('leaves.approve');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('leaves.request');
    }

    public function approve(User $user, LeaveRequest $leaveRequest): bool
    {
        if (!$user->hasPermission('leaves.approve') && !$user->hasRole('super-admin') && !$user->hasRole('branch-manager') && !$user->hasRole('hr-admin')) {
            return false;
        }

        if ($user->hasRole('super-admin')) {
            return in_array($leaveRequest->status, ['pending', 'pending_hr'], true);
        }

        if ($user->hasRole('branch-manager')) {
            return $leaveRequest->status === 'pending';
        }

        if ($user->hasRole('hr-admin')) {
            return in_array($leaveRequest->status, ['pending', 'pending_hr'], true);
        }

        return false;
    }

    public function reject(User $user, LeaveRequest $leaveRequest): bool
    {
        if (!$user->hasPermission('leaves.approve') && !$user->hasRole('super-admin') && !$user->hasRole('branch-manager') && !$user->hasRole('hr-admin')) {
            return false;
        }

        if ($user->hasRole('super-admin')) {
            return in_array($leaveRequest->status, ['pending', 'pending_hr'], true);
        }

        if ($user->hasRole('branch-manager')) {
            return $leaveRequest->status === 'pending';
        }

        if ($user->hasRole('hr-admin')) {
            return in_array($leaveRequest->status, ['pending', 'pending_hr'], true);
        }

        return false;
    }
}
