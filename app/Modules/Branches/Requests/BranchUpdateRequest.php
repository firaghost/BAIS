<?php

declare(strict_types=1);

namespace App\Modules\Branches\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BranchUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $branchId = $this->route('branch')?->id;

        return [
            'branch_code' => ['sometimes', 'nullable', 'string', 'min:2', 'max:50', 'unique:branches,branch_code,'.(string) ($branchId ?? 'NULL')],
            'name' => ['sometimes', 'required', 'string', 'min:2', 'max:150'],
            'address_line' => ['sometimes', 'nullable', 'string', 'max:255'],
            'city' => ['sometimes', 'nullable', 'string', 'max:100'],
            'state' => ['sometimes', 'nullable', 'string', 'max:100'],
            'manager_employee_id' => ['sometimes', 'nullable', 'integer', 'min:1', 'exists:employees,id'],
            'latitude' => ['sometimes', 'required', 'numeric', 'between:-90,90'],
            'longitude' => ['sometimes', 'required', 'numeric', 'between:-180,180'],
            'radius_meters' => ['sometimes', 'required', 'integer', 'min:10', 'max:5000'],
        ];
    }

    public function payload(): array
    {
        return $this->validated();
    }
}
