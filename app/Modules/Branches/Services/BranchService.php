<?php

declare(strict_types=1);

namespace App\Modules\Branches\Services;

use App\Modules\Branches\Models\Branch;

class BranchService
{
    public function create(array $data): Branch
    {
        return Branch::query()->create([
            'name' => (string) $data['name'],
            'latitude' => (float) $data['latitude'],
            'longitude' => (float) $data['longitude'],
            'radius_meters' => (int) $data['radius_meters'],
        ]);
    }

    public function update(Branch $branch, array $data): Branch
    {
        $branch->fill($data);
        $branch->save();

        return $branch;
    }

    public function delete(Branch $branch): void
    {
        $branch->delete();
    }
}
