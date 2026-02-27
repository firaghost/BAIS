<?php

declare(strict_types=1);

namespace App\Modules\Departments\Services;

use App\Modules\Departments\Models\Department;

class DepartmentService
{
    public function create(array $data): Department
    {
        return Department::query()->create([
            'name' => (string) $data['name'],
            'is_active' => array_key_exists('is_active', $data) ? (bool) $data['is_active'] : true,
        ]);
    }

    public function update(Department $department, array $data): Department
    {
        $department->fill([
            'name' => array_key_exists('name', $data) ? (string) $data['name'] : $department->name,
            'is_active' => array_key_exists('is_active', $data) ? (bool) $data['is_active'] : $department->is_active,
        ]);

        $department->save();

        return $department;
    }

    public function delete(Department $department): void
    {
        $department->delete();
    }
}
