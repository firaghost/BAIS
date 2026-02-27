<?php

declare(strict_types=1);

namespace App\Modules\Settings\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateApiKeyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
        ];
    }

    public function name(): string
    {
        return trim((string) $this->input('name'));
    }
}
