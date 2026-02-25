<?php

declare(strict_types=1);

namespace App\Modules\Payroll\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PayrollGenerateRequest extends FormRequest
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
            'month' => ['required', 'string', 'regex:/^\d{4}-\d{2}$/'],
        ];
    }

    public function userId(): int
    {
        $value = $this->validated('user_id');

        return is_numeric($value) ? (int) $value : 0;
    }

    public function userIdOrNull(): ?int
    {
        $value = $this->validated('user_id');

        return is_numeric($value) ? (int) $value : null;
    }

    public function employeeId(): ?int
    {
        $value = $this->validated('employee_id');

        return is_numeric($value) ? (int) $value : null;
    }

    public function month(): string
    {
        return (string) $this->validated('month');
    }
}
