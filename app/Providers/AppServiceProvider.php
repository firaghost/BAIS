<?php

namespace App\Providers;

use App\Modules\Audit\Models\AuditLog;
use App\Modules\Audit\Policies\AuditLogPolicy;
use App\Modules\Branches\Models\Branch;
use App\Modules\Branches\Policies\BranchPolicy;
use App\Modules\Employees\Models\Employee;
use App\Modules\Employees\Policies\EmployeePolicy;
use App\Modules\Leaves\Models\LeaveRequest;
use App\Modules\Leaves\Policies\LeaveRequestPolicy;
use App\Modules\Payroll\Models\PayrollRecord;
use App\Modules\Payroll\Policies\PayrollRecordPolicy;
use App\Modules\Reports\Models\ReportRun;
use App\Modules\Reports\Policies\ReportRunPolicy;
use App\Modules\Shifts\Models\Shift;
use App\Modules\Shifts\Policies\ShiftPolicy;
use App\Models\User;
use App\Policies\UserPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::guessPolicyNamesUsing(static function (string $modelClass): array|string {
            if (str_starts_with($modelClass, 'App\\Modules\\') && str_contains($modelClass, '\\Models\\')) {
                $policyClass = str_replace('\\Models\\', '\\Policies\\', $modelClass).'Policy';

                return class_exists($policyClass) ? $policyClass : [];
            }

            if (str_starts_with($modelClass, 'App\\Models\\')) {
                $policyClass = str_replace('App\\Models\\', 'App\\Policies\\', $modelClass).'Policy';

                return class_exists($policyClass) ? $policyClass : [];
            }

            return [];
        });

        Gate::policy(AuditLog::class, AuditLogPolicy::class);
        Gate::policy(Branch::class, BranchPolicy::class);
        Gate::policy(Employee::class, EmployeePolicy::class);
        Gate::policy(LeaveRequest::class, LeaveRequestPolicy::class);
        Gate::policy(PayrollRecord::class, PayrollRecordPolicy::class);
        Gate::policy(ReportRun::class, ReportRunPolicy::class);
        Gate::policy(Shift::class, ShiftPolicy::class);
        Gate::policy(User::class, UserPolicy::class);
    }
}
