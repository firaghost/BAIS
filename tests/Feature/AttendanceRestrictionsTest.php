<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Modules\Holidays\Models\Holiday;
use App\Modules\Roles\Models\Role;
use App\Models\User;
use Carbon\Carbon;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AttendanceRestrictionsTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsEmployee(): User
    {
        $this->seed(RbacSeeder::class);

        $user = User::factory()->create();

        $employeeRole = Role::query()->where('slug', 'employee')->first();
        if ($employeeRole) {
            $user->roles()->syncWithoutDetaching([$employeeRole->id]);
        }

        Sanctum::actingAs($user);

        return $user;
    }

    public function test_check_out_is_blocked_on_sunday_in_production_mode(): void
    {
        config(['app.debug' => false]);

        $this->actingAsEmployee();

        Carbon::setTestNow(Carbon::parse('2026-03-01 10:00:00')); // Sunday

        $response = $this->postJson('/api/attendance/check-out', []);

        $response->assertStatus(403);
    }

    public function test_check_out_is_blocked_on_holiday_in_production_mode(): void
    {
        config(['app.debug' => false]);

        $this->actingAsEmployee();

        Carbon::setTestNow(Carbon::parse('2026-03-04 10:00:00')); // Wednesday

        Holiday::query()->create([
            'country_code' => 'ET',
            'holiday_date' => Carbon::now()->toDateString(),
            'name' => 'Test Holiday',
            'type' => 'public',
            'is_active' => true,
            'source' => 'test',
        ]);

        $response = $this->postJson('/api/attendance/check-out', []);

        $response->assertStatus(403);
    }

    public function test_check_out_is_not_blocked_in_dev_mode_and_returns_normal_error(): void
    {
        config(['app.debug' => true]);

        $this->actingAsEmployee();

        Carbon::setTestNow(Carbon::parse('2026-03-01 10:00:00')); // Sunday

        $response = $this->postJson('/api/attendance/check-out', []);

        $response->assertStatus(409);
    }
}
