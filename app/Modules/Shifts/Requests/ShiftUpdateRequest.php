<?php

declare(strict_types=1);

namespace App\Modules\Shifts\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ShiftUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'branch_id' => ['sometimes', 'required', 'integer', 'min:1', 'exists:branches,id'],
            'start_time' => ['sometimes', 'required', 'date_format:H:i'],
            'end_time' => ['sometimes', 'required', 'date_format:H:i'],
            'grace_minutes' => ['sometimes', 'required', 'integer', 'min:0', 'max:240'],
            'overtime_threshold' => ['sometimes', 'required', 'integer', 'min:0', 'max:1440'],
        ];
    }

    public function payload(): array
    {
        return $this->validated();
    }
}
