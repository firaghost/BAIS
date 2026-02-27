<?php

declare(strict_types=1);

namespace App\Modules\Departments\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DepartmentUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }

    public function payload(): array
    {
        return [
            'name' => (string) $this->input('name'),
            'is_active' => $this->has('is_active') ? (bool) $this->input('is_active') : true,
        ];
    }
}
