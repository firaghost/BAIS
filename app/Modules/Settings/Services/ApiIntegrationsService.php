<?php

declare(strict_types=1);

namespace App\Modules\Settings\Services;

use App\Modules\Settings\Models\ApiKey;
use App\Modules\Settings\Models\SystemSetting;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class ApiIntegrationsService
{
    private const WEBHOOK_CONFIG_KEY = 'webhook_config';

    public function listKeys(): array
    {
        return ApiKey::query()
            ->orderByDesc('created_at')
            ->limit(500)
            ->get()
            ->map(static function (ApiKey $k): array {
                return [
                    'id' => $k->id,
                    'name' => $k->name,
                    'prefix' => $k->prefix,
                    'created_at' => optional($k->created_at)->toISOString(),
                    'last_used_at' => optional($k->last_used_at)->toISOString(),
                    'status' => $k->revoked_at ? 'revoked' : 'active',
                ];
            })
            ->all();
    }

    public function createKey(?User $user, string $name): array
    {
        $prefix = $this->generateUniquePrefix();
        $plain = $this->generatePlainKey($prefix);

        $apiKey = ApiKey::query()->create([
            'name' => $name,
            'prefix' => $prefix,
            'key_hash' => hash('sha256', $plain),
            'created_by_user_id' => $user?->id,
        ]);

        return [
            'id' => $apiKey->id,
            'name' => $apiKey->name,
            'prefix' => $apiKey->prefix,
            'key' => $plain,
            'created_at' => optional($apiKey->created_at)->toISOString(),
            'status' => 'active',
        ];
    }

    public function regenerateKey(?User $user, ApiKey $apiKey): array
    {
        if ($apiKey->revoked_at) {
            return [
                'id' => $apiKey->id,
                'name' => $apiKey->name,
                'prefix' => $apiKey->prefix,
                'key' => null,
                'created_at' => optional($apiKey->created_at)->toISOString(),
                'status' => 'revoked',
            ];
        }

        $plain = $this->generatePlainKey($apiKey->prefix);
        $apiKey->update([
            'key_hash' => hash('sha256', $plain),
        ]);

        return [
            'id' => $apiKey->id,
            'name' => $apiKey->name,
            'prefix' => $apiKey->prefix,
            'key' => $plain,
            'created_at' => optional($apiKey->created_at)->toISOString(),
            'status' => 'active',
        ];
    }

    public function revokeKey(?User $user, ApiKey $apiKey): void
    {
        if ($apiKey->revoked_at) {
            return;
        }

        $apiKey->update(['revoked_at' => now()]);
    }

    public function getWebhookConfig(): array
    {
        $defaults = [
            'endpoint_url' => '',
            'secret' => $this->ensureWebhookSecret(),
            'enabled_events' => ['punch'],
            'verified' => false,
        ];

        $row = SystemSetting::query()->where('key', self::WEBHOOK_CONFIG_KEY)->first();
        if (!$row) {
            return $defaults;
        }

        $value = is_array($row->value) ? $row->value : [];
        $enabled = is_array($value['enabled_events'] ?? null) ? $value['enabled_events'] : $defaults['enabled_events'];

        return [
            'endpoint_url' => (string) ($value['endpoint_url'] ?? $defaults['endpoint_url']),
            'secret' => (string) ($value['secret'] ?? $defaults['secret']),
            'enabled_events' => array_values($enabled),
            'verified' => (bool) ($value['verified'] ?? false),
        ];
    }

    public function updateWebhookConfig(array $payload): array
    {
        $current = $this->getWebhookConfig();
        $endpointUrl = trim((string) ($payload['endpoint_url'] ?? ''));
        $enabledEvents = is_array($payload['enabled_events'] ?? null) ? $payload['enabled_events'] : [];

        $saved = SystemSetting::query()->updateOrCreate(
            ['key' => self::WEBHOOK_CONFIG_KEY],
            ['value' => [
                'endpoint_url' => $endpointUrl,
                'secret' => $current['secret'],
                'enabled_events' => array_values(array_unique(array_map('strval', $enabledEvents))),
                'verified' => false,
            ]],
        );

        return is_array($saved->value) ? $saved->value : $current;
    }

    public function testWebhookConnection(): array
    {
        $cfg = $this->getWebhookConfig();
        $endpoint = trim((string) ($cfg['endpoint_url'] ?? ''));

        if ($endpoint === '') {
            return [
                'ok' => false,
                'message' => 'Endpoint URL is required.',
            ];
        }

        $url = str_starts_with($endpoint, 'http://') || str_starts_with($endpoint, 'https://')
            ? $endpoint
            : 'https://'.$endpoint;

        try {
            $res = Http::timeout(5)->post($url, [
                'type' => 'test',
                'sent_at' => now()->toISOString(),
            ]);

            $ok = $res->successful();
            $this->setWebhookVerified($ok);

            return [
                'ok' => $ok,
                'status' => $res->status(),
            ];
        } catch (\Throwable $e) {
            $this->setWebhookVerified(false);

            return [
                'ok' => false,
                'message' => 'Connection failed.',
            ];
        }
    }

    private function setWebhookVerified(bool $verified): void
    {
        $row = SystemSetting::query()->where('key', self::WEBHOOK_CONFIG_KEY)->first();
        if (!$row) {
            return;
        }

        $value = is_array($row->value) ? $row->value : [];
        $value['verified'] = $verified;
        $row->update(['value' => $value]);
    }

    private function generatePlainKey(string $prefix): string
    {
        return $prefix.'.'.Str::random(48);
    }

    private function generateUniquePrefix(): string
    {
        for ($i = 0; $i < 20; $i++) {
            $candidate = 'pk_'.Str::lower(Str::random(10));
            $exists = ApiKey::query()->where('prefix', $candidate)->exists();
            if (!$exists) {
                return $candidate;
            }
        }

        return 'pk_'.Str::lower(Str::random(12));
    }

    private function ensureWebhookSecret(): string
    {
        $row = SystemSetting::query()->where('key', self::WEBHOOK_CONFIG_KEY)->first();
        $value = $row && is_array($row->value) ? $row->value : null;

        $secret = is_array($value) && is_string($value['secret'] ?? null) ? (string) $value['secret'] : '';
        if ($secret !== '') {
            return $secret;
        }

        $secret = 'whsec_'.Str::random(32);
        SystemSetting::query()->updateOrCreate(
            ['key' => self::WEBHOOK_CONFIG_KEY],
            ['value' => [
                'endpoint_url' => '',
                'secret' => $secret,
                'enabled_events' => ['punch'],
                'verified' => false,
            ]],
        );

        return $secret;
    }
}
