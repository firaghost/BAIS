<?php

namespace Database\Seeders;

use App\Models\User;
use App\Modules\Roles\Models\Role;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Database\Seeders\RbacSeeder;
use Database\Seeders\ReportsSeeder;
use Database\Seeders\DemoUsersSeeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        $user = User::query()->updateOrCreate(
            ['email' => 'test@example.com'],
            ['name' => 'Test User', 'password' => Hash::make('password')],
        );

        $this->call(RbacSeeder::class);
        $this->call(ReportsSeeder::class);
        $this->call(DemoUsersSeeder::class);

        $superAdminRole = Role::query()->where('slug', 'super-admin')->first();

        if ($superAdminRole) {
            $user->roles()->syncWithoutDetaching([$superAdminRole->id]);
        }
    }
}
