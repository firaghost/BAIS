<?php

declare(strict_types=1);

namespace App\Modules\Attendance\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AttendanceCheckInRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'branch_id' => ['required', 'integer', 'min:1', 'exists:branches,id'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
        ];
    }

    public function branchId(): int
    {
        return (int) $this->validated('branch_id');
    }

    public function latitude(): float
    {
        return (float) $this->validated('latitude');
    }

    public function longitude(): float
    {
        return (float) $this->validated('longitude');
    }
}
