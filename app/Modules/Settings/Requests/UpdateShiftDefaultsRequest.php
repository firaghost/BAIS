<?php

declare(strict_types=1);

namespace App\Modules\Settings\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateShiftDefaultsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'default_shift_template_id' => ['nullable', 'integer', 'min:1', 'exists:shift_templates,id'],
            'strict_break_compliance' => ['required', 'boolean'],
        ];
    }

    public function payload(): array
    {
        $data = $this->validated();

        return [
            'default_shift_template_id' => $data['default_shift_template_id'] ?? null,
            'strict_break_compliance' => (bool) $data['strict_break_compliance'],
        ];
    }
}
