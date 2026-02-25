<?php

declare(strict_types=1);

namespace App\Modules\Payroll\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PayrollExportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'month' => ['nullable', 'string', 'regex:/^\d{4}-\d{2}$/'],
            'employee_id' => ['nullable', 'integer', 'min:1', 'exists:employees,id'],
            'branch_id' => ['nullable', 'integer', 'min:1', 'exists:branches,id'],
        ];
    }

    public function month(): string
    {
        $value = $this->validated('month');

        return is_string($value) ? $value : now()->format('Y-m');
    }

    public function employeeId(): ?int
    {
        $value = $this->validated('employee_id');

        return is_numeric($value) ? (int) $value : null;
    }

    public function branchId(): ?int
    {
        $value = $this->validated('branch_id');

        return is_numeric($value) ? (int) $value : null;
    }
}
