<?php

declare(strict_types=1);

namespace App\Modules\Reports\Policies;

use App\Models\User;

class ReportRunPolicy
{
    public function view(User $user): bool
    {
        return $user->hasPermission('reports.view');
    }

    public function run(User $user): bool
    {
        return $user->hasPermission('reports.run');
    }

    public function export(User $user): bool
    {
        return $user->hasPermission('reports.export');
    }

    public function delete(User $user): bool
    {
        return $user->hasPermission('reports.delete');
    }
}
