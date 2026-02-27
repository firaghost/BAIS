<?php

declare(strict_types=1);

namespace App\Modules\Audit\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AuditLogIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'user_id' => ['nullable', 'integer', 'min:1'],
            'action' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'in:all,policy,security,export'],
            'model_type' => ['nullable', 'string', 'max:255'],
            'model_id' => ['nullable', 'integer', 'min:1'],
            'search' => ['nullable', 'string', 'max:200'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:200'],
        ];
    }

    public function filters(): array
    {
        return $this->only(['user_id', 'action', 'category', 'model_type', 'model_id', 'search', 'from', 'to']);
    }

    public function perPage(): int
    {
        return (int) ($this->validated('per_page') ?? 50);
    }
}
