<?php

declare(strict_types=1);

namespace App\Modules\SystemUsers\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SystemUserStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'role_id' => ['required', 'integer', 'min:1'],
            'access_scope_type' => ['required', 'string', 'in:global,regional,branch'],
            'access_scope_region' => ['nullable', 'string', 'max:150', 'required_if:access_scope_type,regional'],
            'access_scope_branch_id' => ['nullable', 'integer', 'min:1', 'required_if:access_scope_type,branch', 'exists:branches,id'],
        ];
    }

    public function payload(): array
    {
        return [
            'name' => trim((string) $this->validated('name')),
            'email' => strtolower(trim((string) $this->validated('email'))),
            'role_id' => (int) $this->validated('role_id'),
            'access_scope_type' => (string) $this->validated('access_scope_type'),
            'access_scope_region' => $this->validated('access_scope_region'),
            'access_scope_branch_id' => $this->validated('access_scope_branch_id'),
        ];
    }
}
