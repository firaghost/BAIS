<?php

declare(strict_types=1);

namespace App\Modules\Leaves\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LeaveRequestApproveRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'rejection_reason' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function rejectionReason(): ?string
    {
        return $this->validated('rejection_reason');
    }
}
