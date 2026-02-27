<?php

declare(strict_types=1);

namespace App\Modules\Branches\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BranchStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'branch_code' => ['nullable', 'string', 'min:2', 'max:50', 'unique:branches,branch_code'],
            'name' => ['required', 'string', 'min:2', 'max:150'],
            'address_line' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'manager_employee_id' => ['nullable', 'integer', 'min:1', 'exists:employees,id'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'radius_meters' => ['required', 'integer', 'min:10', 'max:5000'],
        ];
    }

    public function payload(): array
    {
        return $this->validated();
    }
}
