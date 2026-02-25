<?php

declare(strict_types=1);

namespace App\Modules\Attendance\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AttendanceCorrectionStoreRequest extends FormRequest
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
            'attendance_log_id' => ['required', 'integer', 'min:1', 'exists:attendance_logs,id'],
            'proposed_check_in_time' => ['nullable', 'date'],
            'proposed_check_out_time' => ['nullable', 'date', 'after_or_equal:proposed_check_in_time'],
            'reason' => ['required', 'string', 'min:3', 'max:1000'],
        ];
    }

    public function payload(): array
    {
        return $this->validated();
    }
}
