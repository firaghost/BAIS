<?php

declare(strict_types=1);

namespace App\Modules\Auth\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
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
            'login' => ['sometimes', 'required_without:email', 'string', 'min:3', 'max:255'],
            'email' => ['sometimes', 'required_without:login', 'string', 'email:rfc', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'max:255'],
            'device_identifier' => ['required', 'string', 'min:6', 'max:191'],
            'device_name' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function loginIdentifier(): string
    {
        $login = $this->validated('login');

        if (is_string($login) && trim($login) !== '') {
            return trim($login);
        }

        $email = $this->validated('email');

        if (is_string($email) && trim($email) !== '') {
            return trim($email);
        }

        return '';
    }

    public function password(): string
    {
        return (string) $this->validated('password');
    }

    public function deviceName(): string
    {
        return (string) ($this->validated('device_name') ?? 'web');
    }

    public function deviceIdentifier(): string
    {
        return (string) $this->validated('device_identifier');
    }
}
