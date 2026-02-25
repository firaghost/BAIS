<?php

declare(strict_types=1);

namespace App\Modules\Branches\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BranchUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'min:2', 'max:150'],
            'latitude' => ['sometimes', 'required', 'numeric', 'between:-90,90'],
            'longitude' => ['sometimes', 'required', 'numeric', 'between:-180,180'],
            'radius_meters' => ['sometimes', 'required', 'integer', 'min:10', 'max:5000'],
        ];
    }

    public function payload(): array
    {
        return $this->validated();
    }
}
