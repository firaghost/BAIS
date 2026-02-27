<?php

declare(strict_types=1);

namespace App\Modules\Employees\Requests;

use Illuminate\Foundation\Http\FormRequest;

class EmployeeStoreRequest extends FormRequest
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
            'user_id' => ['nullable', 'integer', 'min:1', 'exists:users,id'],
            'branch_id' => ['nullable', 'integer', 'min:1', 'exists:branches,id'],
            'branch_code' => ['nullable', 'string', 'min:1', 'max:50', 'exists:branches,branch_code'],
            'branch_name' => ['nullable', 'string', 'min:2', 'max:150', 'exists:branches,name'],
            'first_name' => ['required', 'string', 'min:1', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'min:1', 'max:100'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:150'],
            'job_title' => ['nullable', 'string', 'max:150'],
            'department' => ['nullable', 'string', 'max:150'],
            'hire_date' => ['required', 'date', 'date_format:Y-m-d'],
            'status' => ['nullable', 'string', 'in:active,inactive,on_leave,probation,suspended'],
        ];
    }

    public function payload(): array
    {
        return $this->validated();
    }
}
