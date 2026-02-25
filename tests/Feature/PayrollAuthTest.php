<?php

namespace Tests\Feature;

use Tests\TestCase;

class PayrollAuthTest extends TestCase
{
    public function test_payroll_records_requires_authentication(): void
    {
        $response = $this->getJson('/api/payroll/records');

        $response->assertStatus(401);
    }

    public function test_payroll_generate_requires_authentication(): void
    {
        $response = $this->postJson('/api/payroll/generate', ['user_id' => 1, 'month' => '2026-02']);

        $response->assertStatus(401);
    }
}
