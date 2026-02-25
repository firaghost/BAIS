<?php

namespace Tests\Feature;

use Tests\TestCase;

class AttendanceManageAuthTest extends TestCase
{
    public function test_attendance_manage_requires_authentication(): void
    {
        $response = $this->getJson('/api/attendance/manage');

        $response->assertStatus(401);
    }
}
