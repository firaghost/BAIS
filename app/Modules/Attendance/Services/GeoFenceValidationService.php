<?php

declare(strict_types=1);

namespace App\Modules\Attendance\Services;

class GeoFenceValidationService
{
    private const EARTH_RADIUS_METERS = 6371000.0;

    public function distanceMeters(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $lat1Rad = deg2rad($lat1);
        $lat2Rad = deg2rad($lat2);
        $deltaLat = deg2rad($lat2 - $lat1);
        $deltaLon = deg2rad($lon2 - $lon1);

        $a = sin($deltaLat / 2) ** 2
            + cos($lat1Rad) * cos($lat2Rad) * (sin($deltaLon / 2) ** 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return self::EARTH_RADIUS_METERS * $c;
    }

    public function isWithinRadiusMeters(
        float $branchLat,
        float $branchLon,
        float $userLat,
        float $userLon,
        int $radiusMeters,
    ): bool {
        if ($radiusMeters <= 0) {
            return false;
        }

        return $this->distanceMeters($branchLat, $branchLon, $userLat, $userLon) <= $radiusMeters;
    }
}
