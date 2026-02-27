<?php

declare(strict_types=1);

namespace App\Modules\Settings\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ShiftTemplateUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:150'],
            'start_time' => ['sometimes', 'required', 'date_format:H:i'],
            'end_time' => ['sometimes', 'required', 'date_format:H:i'],
            'break_minutes' => ['sometimes', 'required', 'integer', 'min:0', 'max:600'],
            'status' => ['sometimes', 'required', 'string', 'in:active,draft'],
        ];
    }

    public function payload(): array
    {
        $data = $this->validated();

        if (isset($data['name'])) {
            $data['name'] = trim((string) $data['name']);
        }
        if (isset($data['break_minutes'])) {
            $data['break_minutes'] = (int) $data['break_minutes'];
        }

        return $data;
    }
}
