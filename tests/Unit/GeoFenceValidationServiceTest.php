<?php

namespace Tests\Unit;

use App\Modules\Attendance\Services\GeoFenceValidationService;
use PHPUnit\Framework\TestCase;

class GeoFenceValidationServiceTest extends TestCase
{
    public function test_distance_is_zero_for_same_point(): void
    {
        $service = new GeoFenceValidationService();

        $distance = $service->distanceMeters(0.0, 0.0, 0.0, 0.0);

        $this->assertSame(0.0, $distance);
    }

    public function test_distance_is_reasonable_for_one_degree_latitude(): void
    {
        $service = new GeoFenceValidationService();

        $distance = $service->distanceMeters(0.0, 0.0, 1.0, 0.0);

        $this->assertGreaterThan(110_000.0, $distance);
        $this->assertLessThan(112_500.0, $distance);
    }

    public function test_is_within_radius_meters(): void
    {
        $service = new GeoFenceValidationService();

        $this->assertTrue($service->isWithinRadiusMeters(0.0, 0.0, 0.0, 0.0, 1));
        $this->assertFalse($service->isWithinRadiusMeters(0.0, 0.0, 1.0, 0.0, 1000));
    }
}
