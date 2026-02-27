<?php

declare(strict_types=1);

namespace App\Modules\Settings\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateNotificationRulesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'rules' => ['required', 'array'],
            'rules.*' => ['required', 'array'],
            'rules.*.in_app' => ['required', 'boolean'],
            'rules.*.email' => ['required', 'boolean'],
            'rules.*.sms' => ['required', 'boolean'],
        ];
    }

    public function payload(): array
    {
        $rules = $this->input('rules');
        if (!is_array($rules)) {
            return ['rules' => []];
        }

        return ['rules' => $rules];
    }
}
