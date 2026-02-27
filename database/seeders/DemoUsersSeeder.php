<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\User;
use App\Modules\Branches\Models\Branch;
use App\Modules\Roles\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class DemoUsersSeeder extends Seeder
{
    public function run(): void
    {
        $passwordHash = Hash::make('password');

        $hasIsActive = Schema::hasColumn('users', 'is_active');
        $hasAccessScopeType = Schema::hasColumn('users', 'access_scope_type');
        $hasAccessScopeBranchId = Schema::hasColumn('users', 'access_scope_branch_id');
        $hasAccessScopeRegion = Schema::hasColumn('users', 'access_scope_region');

        $branchId = null;
        if ($hasAccessScopeBranchId) {
            $branchId = Branch::query()->value('id');
        }

        $accounts = [
            [
                'role_slug' => 'super-admin',
                'name' => 'Demo Super Admin',
                'email' => 'superadmin@demo.local',
                'scope' => ['type' => 'global', 'region' => '', 'branch_id' => null],
            ],
            [
                'role_slug' => 'hr-admin',
                'name' => 'Demo HR Admin',
                'email' => 'hradmin@demo.local',
                'scope' => ['type' => 'global', 'region' => '', 'branch_id' => null],
            ],
            [
                'role_slug' => 'branch-manager',
                'name' => 'Demo Branch Manager',
                'email' => 'branchmanager@demo.local',
                'scope' => ['type' => 'branch', 'region' => '', 'branch_id' => $branchId],
            ],
            [
                'role_slug' => 'payroll-officer',
                'name' => 'Demo Payroll Officer',
                'email' => 'payroll@demo.local',
                'scope' => ['type' => 'global', 'region' => '', 'branch_id' => null],
            ],
            [
                'role_slug' => 'executive-viewer',
                'name' => 'Demo Executive Viewer',
                'email' => 'executive@demo.local',
                'scope' => ['type' => 'global', 'region' => '', 'branch_id' => null],
            ],
            [
                'role_slug' => 'employee',
                'name' => 'Demo Employee',
                'email' => 'employee@demo.local',
                'scope' => ['type' => 'global', 'region' => '', 'branch_id' => null],
            ],
        ];

        foreach ($accounts as $acc) {
            $attributes = [
                'name' => $acc['name'],
                'password' => $passwordHash,
            ];

            if ($hasIsActive) {
                $attributes['is_active'] = true;
            }

            if ($hasAccessScopeType) {
                $attributes['access_scope_type'] = $acc['scope']['type'];
            }

            if ($hasAccessScopeRegion) {
                $attributes['access_scope_region'] = $acc['scope']['region'];
            }

            if ($hasAccessScopeBranchId) {
                $attributes['access_scope_branch_id'] = $acc['scope']['branch_id'];
            }

            $user = User::query()->updateOrCreate(
                ['email' => $acc['email']],
                $attributes,
            );

            $role = Role::query()->where('slug', $acc['role_slug'])->first();

            if ($role) {
                $user->roles()->sync([$role->id]);
            }
        }
    }

}
