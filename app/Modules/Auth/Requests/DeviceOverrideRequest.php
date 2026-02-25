<?php

declare(strict_types=1);

namespace App\Modules\Auth\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DeviceOverrideRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'user_id' => ['required', 'integer', 'min:1'],
            'device_identifier' => ['required', 'string', 'min:6', 'max:191'],
            'device_name' => ['nullable', 'string', 'max:255'],
            'reason' => ['required', 'string', 'min:5', 'max:500'],
        ];
    }

    public function targetUserId(): int
    {
        return (int) $this->validated('user_id');
    }

    public function deviceIdentifier(): string
    {
        return (string) $this->validated('device_identifier');
    }

    public function deviceName(): ?string
    {
        $value = $this->validated('device_name');

        return $value === null ? null : (string) $value;
    }

    public function reason(): string
    {
        return (string) $this->validated('reason');
    }
}
