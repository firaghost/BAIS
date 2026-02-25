<?php

declare(strict_types=1);

namespace App\Modules\Payroll\Policies;

use App\Models\User;
use App\Modules\Payroll\Models\PayrollRecord;

class PayrollRecordPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('payroll.view');
    }

    public function generate(User $user): bool
    {
        return $user->hasPermission('payroll.generate');
    }

    public function export(User $user): bool
    {
        return $user->hasPermission('payroll.export');
    }

    public function view(User $user, PayrollRecord $record): bool
    {
        return $user->hasPermission('payroll.view');
    }
}
