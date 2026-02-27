<?php

declare(strict_types=1);

namespace App\Modules\Settings\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSecurityPoliciesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'enforce_mfa_admin' => ['required', 'boolean'],
            'enforce_mfa_employee' => ['required', 'boolean'],
            'admin_session_timeout_minutes' => ['required', 'integer', 'min:1', 'max:1440'],
            'employee_session_timeout_minutes' => ['required', 'integer', 'min:1', 'max:1440'],
            'password_min_length' => ['required', 'integer', 'min:6', 'max:64'],
            'require_special_chars' => ['required', 'boolean'],
            'password_expiry_days' => ['required', 'integer', 'min:1', 'max:3650'],
        ];
    }

    public function payload(): array
    {
        return [
            'enforce_mfa_admin' => (bool) $this->input('enforce_mfa_admin'),
            'enforce_mfa_employee' => (bool) $this->input('enforce_mfa_employee'),
            'admin_session_timeout_minutes' => (int) $this->input('admin_session_timeout_minutes'),
            'employee_session_timeout_minutes' => (int) $this->input('employee_session_timeout_minutes'),
            'password_min_length' => (int) $this->input('password_min_length'),
            'require_special_chars' => (bool) $this->input('require_special_chars'),
            'password_expiry_days' => (int) $this->input('password_expiry_days'),
        ];
    }
}
