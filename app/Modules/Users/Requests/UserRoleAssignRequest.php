<?php

declare(strict_types=1);

namespace App\Modules\Users\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UserRoleAssignRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'role_id' => ['required', 'integer', 'min:1'],
        ];
    }

    public function roleId(): int
    {
        return (int) $this->validated('role_id');
    }
}
