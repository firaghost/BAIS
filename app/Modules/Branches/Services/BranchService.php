<?php

declare(strict_types=1);

namespace App\Modules\Branches\Services;

use App\Modules\Branches\Models\Branch;

class BranchService
{
    public function create(array $data): Branch
    {
        return Branch::query()->create([
            'branch_code' => array_key_exists('branch_code', $data) ? $data['branch_code'] : null,
            'name' => (string) $data['name'],
            'address_line' => array_key_exists('address_line', $data) ? $data['address_line'] : null,
            'city' => array_key_exists('city', $data) ? $data['city'] : null,
            'state' => array_key_exists('state', $data) ? $data['state'] : null,
            'manager_employee_id' => array_key_exists('manager_employee_id', $data) ? $data['manager_employee_id'] : null,
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
