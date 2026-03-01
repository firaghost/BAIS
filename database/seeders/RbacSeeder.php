<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Modules\Roles\Models\Permission;
use App\Modules\Roles\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class RbacSeeder extends Seeder
{
    public function run(): void
    {
        $auditView = Permission::query()->firstOrCreate(
            ['slug' => 'audit.view'],
            ['name' => 'View audit logs', 'slug' => 'audit.view'],
        );

        $reportsView = Permission::query()->firstOrCreate(
            ['slug' => 'reports.view'],
            ['name' => 'View reports & analytics', 'slug' => 'reports.view'],
        );

        $reportsRun = Permission::query()->firstOrCreate(
            ['slug' => 'reports.run'],
            ['name' => 'Generate reports', 'slug' => 'reports.run'],
        );

        $reportsExport = Permission::query()->firstOrCreate(
            ['slug' => 'reports.export'],
            ['name' => 'Export reports', 'slug' => 'reports.export'],
        );

        $branchesView = Permission::query()->firstOrCreate(
            ['slug' => 'branches.view'],
            ['name' => 'View branches', 'slug' => 'branches.view'],
        );

        $branchesManage = Permission::query()->firstOrCreate(
            ['slug' => 'branches.manage'],
            ['name' => 'Manage branches', 'slug' => 'branches.manage'],
        );

        $shiftsView = Permission::query()->firstOrCreate(
            ['slug' => 'shifts.view'],
            ['name' => 'View shifts', 'slug' => 'shifts.view'],
        );

        $shiftsManage = Permission::query()->firstOrCreate(
            ['slug' => 'shifts.manage'],
            ['name' => 'Manage shifts', 'slug' => 'shifts.manage'],
        );

        $attendanceCheckIn = Permission::query()->firstOrCreate(
            ['slug' => 'attendance.checkin'],
            ['name' => 'Attendance check-in', 'slug' => 'attendance.checkin'],
        );

        $attendanceCheckOut = Permission::query()->firstOrCreate(
            ['slug' => 'attendance.checkout'],
            ['name' => 'Attendance check-out', 'slug' => 'attendance.checkout'],
        );

        $attendanceHistory = Permission::query()->firstOrCreate(
            ['slug' => 'attendance.history'],
            ['name' => 'View my attendance history', 'slug' => 'attendance.history'],
        );

        $attendanceManageView = Permission::query()->firstOrCreate(
            ['slug' => 'attendance.manage.view'],
            ['name' => 'View attendance (admin)', 'slug' => 'attendance.manage.view'],
        );

        $attendanceManageUpdate = Permission::query()->firstOrCreate(
            ['slug' => 'attendance.manage.update'],
            ['name' => 'Update attendance (admin)', 'slug' => 'attendance.manage.update'],
        );

        $attendanceCorrectionsView = Permission::query()->firstOrCreate(
            ['slug' => 'attendance.corrections.view'],
            ['name' => 'View attendance correction requests', 'slug' => 'attendance.corrections.view'],
        );

        $attendanceCorrectionsRequest = Permission::query()->firstOrCreate(
            ['slug' => 'attendance.corrections.request'],
            ['name' => 'Request attendance correction', 'slug' => 'attendance.corrections.request'],
        );

        $attendanceCorrectionsReview = Permission::query()->firstOrCreate(
            ['slug' => 'attendance.corrections.review'],
            ['name' => 'Review attendance correction requests', 'slug' => 'attendance.corrections.review'],
        );

        $attendanceCorrectionsManage = Permission::query()->firstOrCreate(
            ['slug' => 'attendance.corrections.manage'],
            ['name' => 'Manage attendance correction requests', 'slug' => 'attendance.corrections.manage'],
        );

        $leavesView = Permission::query()->firstOrCreate(
            ['slug' => 'leaves.view'],
            ['name' => 'View leave requests', 'slug' => 'leaves.view'],
        );

        $leavesRequest = Permission::query()->firstOrCreate(
            ['slug' => 'leaves.request'],
            ['name' => 'Request leave', 'slug' => 'leaves.request'],
        );

        $leavesApprove = Permission::query()->firstOrCreate(
            ['slug' => 'leaves.approve'],
            ['name' => 'Approve/reject leave requests', 'slug' => 'leaves.approve'],
        );

        $leavesManage = Permission::query()->firstOrCreate(
            ['slug' => 'leaves.manage'],
            ['name' => 'Manage leave requests', 'slug' => 'leaves.manage'],
        );

        $payrollView = Permission::query()->firstOrCreate(
            ['slug' => 'payroll.view'],
            ['name' => 'View payroll records', 'slug' => 'payroll.view'],
        );

        $payrollGenerate = Permission::query()->firstOrCreate(
            ['slug' => 'payroll.generate'],
            ['name' => 'Generate payroll records', 'slug' => 'payroll.generate'],
        );

        $payrollExport = Permission::query()->firstOrCreate(
            ['slug' => 'payroll.export'],
            ['name' => 'Export payroll CSV', 'slug' => 'payroll.export'],
        );

        $shiftSchedulesView = Permission::query()->firstOrCreate(
            ['slug' => 'shift_schedules.view'],
            ['name' => 'View shift schedules', 'slug' => 'shift_schedules.view'],
        );

        $shiftSchedulesManage = Permission::query()->firstOrCreate(
            ['slug' => 'shift_schedules.manage'],
            ['name' => 'Manage shift schedules', 'slug' => 'shift_schedules.manage'],
        );

        $employeesView = Permission::query()->firstOrCreate(
            ['slug' => 'employees.view'],
            ['name' => 'View employees', 'slug' => 'employees.view'],
        );

        $employeesManage = Permission::query()->firstOrCreate(
            ['slug' => 'employees.manage'],
            ['name' => 'Manage employees', 'slug' => 'employees.manage'],
        );

        $departmentsManage = Permission::query()->firstOrCreate(
            ['slug' => 'departments.manage'],
            ['name' => 'Manage departments', 'slug' => 'departments.manage'],
        );

        $manageUserRoles = Permission::query()->firstOrCreate(
            ['slug' => 'users.roles.manage'],
            ['name' => 'Manage user roles', 'slug' => 'users.roles.manage'],
        );

        $usersManage = Permission::query()->firstOrCreate(
            ['slug' => 'users.manage'],
            ['name' => 'Manage system users', 'slug' => 'users.manage'],
        );

        $deviceOverride = Permission::query()->firstOrCreate(
            ['slug' => 'devices.override'],
            ['name' => 'Override device binding', 'slug' => 'devices.override'],
        );

        $settingsManage = Permission::query()->firstOrCreate(
            ['slug' => 'settings.manage'],
            ['name' => 'Manage system settings', 'slug' => 'settings.manage'],
        );

        $holidaysManage = Permission::query()->firstOrCreate(
            ['slug' => 'holidays.manage'],
            ['name' => 'Manage holidays', 'slug' => 'holidays.manage'],
        );

        $roles = [
            'Super Admin',
            'HR Admin',
            'Branch Manager',
            'Payroll Officer',
            'Executive Viewer',
            'Employee',
        ];

        $superAdmin = null;
        $employeeRole = null;
        $hrAdminRole = null;
        $branchManagerRole = null;

        foreach ($roles as $name) {
            $role = Role::query()->firstOrCreate(
                ['slug' => Str::slug($name)],
                ['name' => $name, 'slug' => Str::slug($name)],
            );

            if ($role->slug === 'super-admin') {
                $superAdmin = $role;
            }

            if ($role->slug === 'employee') {
                $employeeRole = $role;
            }

            if ($role->slug === 'hr-admin') {
                $hrAdminRole = $role;
            }

            if ($role->slug === 'branch-manager') {
                $branchManagerRole = $role;
            }
        }

        if ($superAdmin) {
            $superAdmin->permissions()->syncWithoutDetaching([
                $auditView->id,
                $branchesView->id,
                $branchesManage->id,
                $shiftsView->id,
                $shiftsManage->id,
                $attendanceCheckIn->id,
                $attendanceCheckOut->id,
                $attendanceHistory->id,
                $attendanceManageView->id,
                $attendanceManageUpdate->id,
                $attendanceCorrectionsView->id,
                $attendanceCorrectionsRequest->id,
                $attendanceCorrectionsReview->id,
                $attendanceCorrectionsManage->id,
                $leavesView->id,
                $leavesRequest->id,
                $leavesApprove->id,
                $leavesManage->id,
                $payrollView->id,
                $payrollGenerate->id,
                $payrollExport->id,
                $shiftSchedulesView->id,
                $shiftSchedulesManage->id,
                $employeesView->id,
                $employeesManage->id,
                $departmentsManage->id,
                $manageUserRoles->id,
                $usersManage->id,
                $deviceOverride->id,
                $settingsManage->id,
                $holidaysManage->id,
            ]);
        }

        if ($employeeRole) {
            $employeeRole->permissions()->syncWithoutDetaching([
                $shiftsView->id,
                $attendanceCheckIn->id,
                $attendanceCheckOut->id,
                $attendanceHistory->id,
                $attendanceCorrectionsView->id,
                $attendanceCorrectionsRequest->id,
                $shiftSchedulesView->id,
                $leavesRequest->id,
            ]);
        }

        if ($hrAdminRole) {
            $hrAdminRole->permissions()->syncWithoutDetaching([
                $branchesView->id,
                $employeesView->id,
                $employeesManage->id,
                $departmentsManage->id,
                $shiftsView->id,
                $attendanceCheckIn->id,
                $attendanceCheckOut->id,
                $attendanceHistory->id,
                $attendanceManageView->id,
                $attendanceManageUpdate->id,
                $attendanceCorrectionsView->id,
                $attendanceCorrectionsReview->id,
                $attendanceCorrectionsManage->id,
                $shiftSchedulesView->id,
                $shiftSchedulesManage->id,
                $leavesApprove->id,
                $holidaysManage->id,
            ]);
        }

        if ($branchManagerRole) {
            $branchManagerRole->permissions()->syncWithoutDetaching([
                $attendanceManageView->id,
                $attendanceCorrectionsView->id,
                $attendanceCorrectionsReview->id,
                $shiftSchedulesView->id,
                $leavesApprove->id,
            ]);
        }
    }
}
