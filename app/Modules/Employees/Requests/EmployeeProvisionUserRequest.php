<?php

declare(strict_types=1);

namespace App\Modules\Employees\Requests;

use Illuminate\Foundation\Http\FormRequest;

class EmployeeProvisionUserRequest extends FormRequest
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
            'email' => ['required', 'string', 'email:rfc', 'max:255', 'unique:users,email'],
            'name' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function email(): string
    {
        return (string) $this->validated('email');
    }

    public function name(): ?string
    {
        $value = $this->validated('name');

        return is_string($value) && trim($value) !== '' ? trim($value) : null;
    }
}
