<?php

declare(strict_types=1);

namespace App\Modules\Settings\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDataRetentionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'audit_logs_days' => ['required', 'integer', 'min:7', 'max:3650'],
            'attendance_days' => ['required', 'integer', 'min:30', 'max:3650'],
            'employee_documents_days' => ['required', 'integer', 'min:30', 'max:7300'],
            'reports_days' => ['required', 'integer', 'min:30', 'max:3650'],
            'api_logs_days' => ['required', 'integer', 'min:7', 'max:3650'],
            'auto_purge_enabled' => ['required', 'boolean'],
        ];
    }

    public function payload(): array
    {
        return [
            'audit_logs_days' => (int) $this->input('audit_logs_days'),
            'attendance_days' => (int) $this->input('attendance_days'),
            'employee_documents_days' => (int) $this->input('employee_documents_days'),
            'reports_days' => (int) $this->input('reports_days'),
            'api_logs_days' => (int) $this->input('api_logs_days'),
            'auto_purge_enabled' => (bool) $this->input('auto_purge_enabled'),
        ];
    }
}
