<?php

declare(strict_types=1);

namespace App\Modules\Employees\Requests;

use Illuminate\Foundation\Http\FormRequest;

class EmployeeUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->all() !== []) {
            return;
        }

        $content = $this->getContent();

        if (!is_string($content) || trim($content) === '') {
            return;
        }

        $decoded = json_decode($content, true);

        if (is_array($decoded)) {
            $this->merge($decoded);
        }
    }

    public function rules(): array
    {
        return [
            'user_id' => ['sometimes', 'nullable', 'integer', 'min:1', 'exists:users,id'],
            'branch_id' => ['sometimes', 'nullable', 'integer', 'min:1', 'exists:branches,id'],
            'branch_code' => ['sometimes', 'nullable', 'string', 'min:1', 'max:50', 'exists:branches,branch_code'],
            'branch_name' => ['sometimes', 'nullable', 'string', 'min:2', 'max:150', 'exists:branches,name'],
            'first_name' => ['sometimes', 'string', 'min:1', 'max:100'],
            'middle_name' => ['sometimes', 'nullable', 'string', 'max:100'],
            'last_name' => ['sometimes', 'string', 'min:1', 'max:100'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:30'],
            'email' => ['sometimes', 'nullable', 'email', 'max:150'],
            'job_title' => ['sometimes', 'nullable', 'string', 'max:150'],
            'department' => ['sometimes', 'nullable', 'string', 'max:150'],
            'hire_date' => ['sometimes', 'date', 'date_format:Y-m-d'],
            'status' => ['sometimes', 'string', 'in:active,inactive,on_leave,probation,suspended'],
        ];
    }

    public function payload(): array
    {
        return $this->validated();
    }
}
