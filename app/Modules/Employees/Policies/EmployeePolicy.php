<?php

declare(strict_types=1);

namespace App\Modules\Employees\Policies;

use App\Models\User;
use App\Modules\Employees\Models\Employee;

class EmployeePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('employees.view');
    }

    public function view(User $user, Employee $employee): bool
    {
        return $user->hasPermission('employees.view');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('employees.manage');
    }

    public function update(User $user, Employee $employee): bool
    {
        return $user->hasPermission('employees.manage');
    }

    public function delete(User $user, Employee $employee): bool
    {
        return $user->hasPermission('employees.manage');
    }
}
