<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Modules\Roles\Models\Permission;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        Permission::query()->firstOrCreate(
            ['slug' => 'audit.view'],
            ['name' => 'View audit logs', 'slug' => 'audit.view'],
        );
    }
}
