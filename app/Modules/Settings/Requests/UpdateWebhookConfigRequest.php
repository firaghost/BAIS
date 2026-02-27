<?php

declare(strict_types=1);

namespace App\Modules\Settings\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateWebhookConfigRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'endpoint_url' => ['nullable', 'string', 'max:255'],
            'enabled_events' => ['nullable', 'array'],
            'enabled_events.*' => ['string', 'max:50'],
        ];
    }

    public function payload(): array
    {
        $endpoint = $this->input('endpoint_url');
        $endpointUrl = is_string($endpoint) ? trim($endpoint) : '';

        $events = $this->input('enabled_events');
        $enabledEvents = is_array($events) ? array_values(array_filter($events, static fn ($v) => is_string($v) && trim($v) !== '')) : [];

        return [
            'endpoint_url' => $endpointUrl,
            'enabled_events' => $enabledEvents,
        ];
    }
}
