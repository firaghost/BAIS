<?php

declare(strict_types=1);

namespace App\Modules\Leaves\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LeaveCreditBulkSetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'year' => ['required', 'integer', 'min:2000', 'max:2100'],
            'leave_type' => ['required', 'string', 'in:annual,sick,personal,other'],
            'total_days' => ['required', 'integer', 'min:0', 'max:365'],
            'employee_ids' => ['nullable', 'array'],
            'employee_ids.*' => ['integer', 'min:1'],
            'apply_to_all' => ['nullable', 'boolean'],
        ];
    }

    public function payload(): array
    {
        return $this->validated();
    }
}
