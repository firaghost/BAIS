<?php

declare(strict_types=1);

namespace App\Modules\Settings\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ShiftTemplateStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i'],
            'break_minutes' => ['required', 'integer', 'min:0', 'max:600'],
            'status' => ['nullable', 'string', 'in:active,draft'],
        ];
    }

    public function payload(): array
    {
        $data = $this->validated();

        return [
            'name' => trim((string) $data['name']),
            'start_time' => (string) $data['start_time'],
            'end_time' => (string) $data['end_time'],
            'break_minutes' => (int) $data['break_minutes'],
            'status' => isset($data['status']) ? (string) $data['status'] : 'active',
        ];
    }
}
