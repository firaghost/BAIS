<?php

declare(strict_types=1);

namespace App\Modules\Settings\Services;

use App\Modules\Settings\Models\ShiftTemplate;
use App\Modules\Settings\Models\SystemSetting;
use Illuminate\Support\Str;

class ShiftTemplatesService
{
    private const SHIFT_DEFAULTS_KEY = 'shift_defaults';

    public function list(): array
    {
        return ShiftTemplate::query()
            ->whereNull('archived_at')
            ->orderBy('id')
            ->get()
            ->map(static function (ShiftTemplate $t): array {
                return [
                    'id' => $t->id,
                    'code' => $t->code,
                    'name' => $t->name,
                    'start_time' => $t->start_time,
                    'end_time' => $t->end_time,
                    'break_minutes' => $t->break_minutes,
                    'status' => $t->status,
                ];
            })
            ->all();
    }

    public function create(array $payload): array
    {
        $template = ShiftTemplate::query()->create([
            'code' => $this->nextCode(),
            'name' => (string) $payload['name'],
            'start_time' => (string) $payload['start_time'],
            'end_time' => (string) $payload['end_time'],
            'break_minutes' => (int) $payload['break_minutes'],
            'status' => (string) ($payload['status'] ?? 'active'),
        ]);

        return [
            'id' => $template->id,
            'code' => $template->code,
            'name' => $template->name,
            'start_time' => $template->start_time,
            'end_time' => $template->end_time,
            'break_minutes' => $template->break_minutes,
            'status' => $template->status,
        ];
    }

    public function update(ShiftTemplate $template, array $payload): array
    {
        $template->fill($payload);
        $template->save();

        return [
            'id' => $template->id,
            'code' => $template->code,
            'name' => $template->name,
            'start_time' => $template->start_time,
            'end_time' => $template->end_time,
            'break_minutes' => $template->break_minutes,
            'status' => $template->status,
        ];
    }

    public function archive(ShiftTemplate $template): void
    {
        if ($template->archived_at) {
            return;
        }

        $template->update(['archived_at' => now()]);

        $defaults = $this->getDefaults();
        if (($defaults['default_shift_template_id'] ?? null) === $template->id) {
            $this->updateDefaults([
                'default_shift_template_id' => null,
                'strict_break_compliance' => (bool) ($defaults['strict_break_compliance'] ?? true),
            ]);
        }
    }

    public function getDefaults(): array
    {
        $defaults = [
            'default_shift_template_id' => null,
            'strict_break_compliance' => true,
        ];

        $row = SystemSetting::query()->where('key', self::SHIFT_DEFAULTS_KEY)->first();
        if (!$row) {
            return $defaults;
        }

        $value = is_array($row->value) ? $row->value : [];

        return [
            'default_shift_template_id' => isset($value['default_shift_template_id']) ? (int) $value['default_shift_template_id'] : null,
            'strict_break_compliance' => isset($value['strict_break_compliance']) ? (bool) $value['strict_break_compliance'] : $defaults['strict_break_compliance'],
        ];
    }

    public function updateDefaults(array $payload): array
    {
        $saved = SystemSetting::query()->updateOrCreate(
            ['key' => self::SHIFT_DEFAULTS_KEY],
            ['value' => $payload],
        );

        return is_array($saved->value) ? $saved->value : $this->getDefaults();
    }

    private function nextCode(): string
    {
        $last = ShiftTemplate::query()->orderByDesc('id')->value('code');
        $n = 1;

        if (is_string($last) && preg_match('/SH-(\d+)/', $last, $m)) {
            $n = (int) $m[1] + 1;
        }

        return 'SH-'.str_pad((string) $n, 3, '0', STR_PAD_LEFT);
    }
}
