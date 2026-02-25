<?php

namespace Tests\Feature;

use Tests\TestCase;

class AttendanceHistoryAuthTest extends TestCase
{
    public function test_attendance_history_requires_authentication(): void
    {
        $response = $this->getJson('/api/attendance/history');

        $response->assertStatus(401);
    }
}
