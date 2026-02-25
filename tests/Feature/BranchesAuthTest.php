<?php

namespace Tests\Feature;

use Tests\TestCase;

class BranchesAuthTest extends TestCase
{
    public function test_branches_requires_authentication(): void
    {
        $response = $this->getJson('/api/branches');

        $response->assertStatus(401);
    }
}
