<?php

declare(strict_types=1);

namespace App\Modules\Settings\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateHeadOfficeGeoFenceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'radius_meters' => ['required', 'integer', 'min:1', 'max:100000'],
        ];
    }

    public function payload(): array
    {
        return [
            'latitude' => (float) $this->input('latitude'),
            'longitude' => (float) $this->input('longitude'),
            'radius_meters' => (int) $this->input('radius_meters'),
        ];
    }
}
