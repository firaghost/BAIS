<?php

declare(strict_types=1);

namespace App\Modules\Reports\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReportRunRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:150'],
            'format' => ['required', 'string', 'in:json,csv,xlsx'],
            'trigger' => ['required', 'string', 'in:manual,scheduled'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'branch_id' => ['nullable', 'integer', 'min:1', 'exists:branches,id'],
            'metrics' => ['nullable', 'array', 'max:20'],
            'metrics.*' => ['string', 'max:50'],
            'template_id' => ['nullable', 'integer', 'min:1', 'exists:report_templates,id'],
            'schedule_frequency' => ['nullable', 'string', 'in:daily,weekly,monthly,yearly'],
        ];
    }

    public function payload(): array
    {
        return $this->validated();
    }
}
