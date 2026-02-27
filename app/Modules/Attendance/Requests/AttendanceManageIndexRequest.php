<?php

declare(strict_types=1);

namespace App\Modules\Attendance\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AttendanceManageIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            'status' => ['nullable', 'string', 'in:checked_in,checked_out'],
            'user_id' => ['nullable', 'integer', 'min:1', 'exists:users,id'],
            'employee_id' => ['nullable', 'integer', 'min:1', 'exists:employees,id'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }

    public function fromDate(): ?string
    {
        $value = $this->validated('from');

        return is_string($value) ? $value : null;
    }

    public function toDate(): ?string
    {
        $value = $this->validated('to');

        return is_string($value) ? $value : null;
    }

    public function status(): ?string
    {
        $value = $this->validated('status');

        return is_string($value) ? $value : null;
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
