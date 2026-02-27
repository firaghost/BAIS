<?php

declare(strict_types=1);

namespace App\Modules\Attendance\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AttendanceCorrectionReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'comment' => ['nullable', 'string', 'max:1000'],
            'excuse_late' => ['nullable', 'boolean'],
        ];
    }

    public function comment(): ?string
    {
        $value = $this->validated('comment');

        return is_string($value) ? $value : null;
    }

    public function excuseLate(): bool
    {
        return (bool) ($this->validated('excuse_late') ?? false);
    }
}
