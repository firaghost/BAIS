<?php

namespace Tests\Feature;

use Tests\TestCase;

class AttendanceCorrectionsAuthTest extends TestCase
{
    public function test_attendance_corrections_requires_authentication(): void
    {
        $response = $this->getJson('/api/attendance/corrections');

        $response->assertStatus(401);
    }
}
