<?php

declare(strict_types=1);

namespace App\Modules\Payroll\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UserShiftScheduleStoreRequest extends FormRequest
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
            'user_id' => ['nullable', 'required_without:employee_id', 'integer', 'min:1', 'exists:users,id'],
            'employee_id' => ['nullable', 'required_without:user_id', 'integer', 'min:1', 'exists:employees,id'],
            'shift_id' => ['required', 'integer', 'min:1', 'exists:shifts,id'],
            'day_of_week' => ['required', 'integer', 'min:0', 'max:6'],
            'is_active' => ['sometimes', 'boolean'],
            'reason' => ['required', 'string', 'min:3', 'max:500'],
        ];
    }

    public function payload(): array
    {
        return $this->validated();
    }

    public function reason(): string
    {
        return (string) $this->validated('reason');
    }
}
