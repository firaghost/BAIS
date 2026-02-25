<?php

declare(strict_types=1);

namespace App\Modules\Attendance\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AttendanceManageUpdateRequest extends FormRequest
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
            'check_in_time' => ['sometimes', 'date'],
            'check_out_time' => ['sometimes', 'nullable', 'date', 'after_or_equal:check_in_time'],
            'status' => ['sometimes', 'string', 'in:checked_in,checked_out'],
            'reason' => ['required', 'string', 'min:3', 'max:500'],
        ];
    }

    public function payload(): array
    {
        return $this->validated();
    }

    public function reason(): string
    {
        return (string) $this->validated('reason');
    }
}
