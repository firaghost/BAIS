<?php

namespace Tests\Feature;

use Tests\TestCase;

class ShiftSchedulesAuthTest extends TestCase
{
    public function test_shift_schedules_requires_authentication(): void
    {
        $response = $this->getJson('/api/payroll/shift-schedules');

        $response->assertStatus(401);
    }
}
