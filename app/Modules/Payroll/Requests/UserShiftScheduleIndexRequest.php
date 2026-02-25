<?php

declare(strict_types=1);

namespace App\Modules\Payroll\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UserShiftScheduleIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'user_id' => ['nullable', 'integer', 'min:1', 'exists:users,id'],
            'employee_id' => ['nullable', 'integer', 'min:1', 'exists:employees,id'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }

    public function userId(): ?int
    {
        $value = $this->validated('user_id');

        return is_numeric($value) ? (int) $value : null;
    }

    public function employeeId(): ?int
    {
        $value = $this->validated('employee_id');

        return is_numeric($value) ? (int) $value : null;
    }

    public function perPage(): int
    {
        $value = $this->validated('per_page');

        return is_numeric($value) ? (int) $value : 20;
    }
}
