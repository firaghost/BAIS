<?php

declare(strict_types=1);

namespace App\Modules\Settings\Services;

use App\Modules\Settings\Models\SystemSetting;

class SystemSettingsService
{
    private const SECURITY_POLICIES_KEY = 'security_policies';
    private const NOTIFICATION_RULES_KEY = 'notification_rules';
    private const DATA_RETENTION_KEY = 'data_retention';
    private const HEAD_OFFICE_GEO_FENCE_KEY = 'head_office_geo_fence';

    private const NOTIFICATION_EVENTS = [
        [
            'id' => 'geo_fence_violation',
            'name' => 'Geo-fence Violation',
            'description' => 'Employee checks in outside designated radius',
            'severity' => 'critical',
        ],
        [
            'id' => 'chronic_lateness',
            'name' => 'Chronic Lateness',
            'description' => '3+ late arrivals within a week',
            'severity' => 'warning',
        ],
        [
            'id' => 'failed_login_attempts',
            'name' => 'Failed Login Attempts',
            'description' => '5 consecutive failed attempts on admin account',
            'severity' => 'critical',
        ],
        [
            'id' => 'shift_swap_request',
            'name' => 'Shift Swap Request',
            'description' => 'Employee requests shift exchange requiring approval',
            'severity' => 'info',
        ],
    ];

    public function getSecurityPolicies(): array
    {
        $defaults = [
            'enforce_mfa_admin' => true,
            'enforce_mfa_employee' => false,
            'admin_session_timeout_minutes' => 30,
            'employee_session_timeout_minutes' => 60,
            'password_min_length' => 12,
            'require_special_chars' => true,
            'password_expiry_days' => 90,
        ];

        $row = SystemSetting::query()->where('key', self::SECURITY_POLICIES_KEY)->first();
        if (!$row) {
            return $defaults;
        }

        $value = is_array($row->value) ? $row->value : [];
        return array_merge($defaults, $value);
    }

    public function updateSecurityPolicies(array $payload): array
    {
        $saved = SystemSetting::query()->updateOrCreate(
            ['key' => self::SECURITY_POLICIES_KEY],
            ['value' => $payload],
        );

        return is_array($saved->value) ? $saved->value : [];
    }

    public function getHeadOfficeGeoFence(): array
    {
        $defaults = [
            'latitude' => 8.992709629807115,
            'longitude' => 38.758933676855925,
            'radius_meters' => 50,
        ];

        $row = SystemSetting::query()->where('key', self::HEAD_OFFICE_GEO_FENCE_KEY)->first();
        if (!$row) {
            return $defaults;
        }

        $value = is_array($row->value) ? $row->value : [];

        return array_merge($defaults, array_intersect_key($value, $defaults));
    }

    public function updateHeadOfficeGeoFence(array $payload): array
    {
        $defaults = $this->getHeadOfficeGeoFence();
        $normalized = array_merge($defaults, array_intersect_key($payload, $defaults));

        $saved = SystemSetting::query()->updateOrCreate(
            ['key' => self::HEAD_OFFICE_GEO_FENCE_KEY],
            ['value' => $normalized],
        );

        return is_array($saved->value) ? array_merge($defaults, $saved->value) : $defaults;
    }

    public function getNotificationRules(): array
    {
        $defaults = $this->notificationRulesDefaults();

        $row = SystemSetting::query()->where('key', self::NOTIFICATION_RULES_KEY)->first();
        if (!$row) {
            return [
                'events' => self::NOTIFICATION_EVENTS,
                'rules' => $defaults,
            ];
        }

        $value = is_array($row->value) ? $row->value : [];
        $savedRules = is_array(($value['rules'] ?? null)) ? $value['rules'] : [];

        return [
            'events' => self::NOTIFICATION_EVENTS,
            'rules' => array_replace($defaults, $this->sanitizeNotificationRules($savedRules)),
        ];
    }

    public function updateNotificationRules(array $payload): array
    {
        $rules = is_array(($payload['rules'] ?? null)) ? $payload['rules'] : [];
        $sanitized = $this->sanitizeNotificationRules($rules);

        SystemSetting::query()->updateOrCreate(
            ['key' => self::NOTIFICATION_RULES_KEY],
            ['value' => ['rules' => $sanitized]],
        );

        return [
            'events' => self::NOTIFICATION_EVENTS,
            'rules' => array_replace($this->notificationRulesDefaults(), $sanitized),
        ];
    }

    public function resetNotificationRules(): array
    {
        $defaults = $this->notificationRulesDefaults();

        SystemSetting::query()->updateOrCreate(
            ['key' => self::NOTIFICATION_RULES_KEY],
            ['value' => ['rules' => $defaults]],
        );

        return [
            'events' => self::NOTIFICATION_EVENTS,
            'rules' => $defaults,
        ];
    }

    public function getDataRetention(): array
    {
        $defaults = $this->dataRetentionDefaults();

        $row = SystemSetting::query()->where('key', self::DATA_RETENTION_KEY)->first();
        if (!$row) {
            return $defaults;
        }

        $value = is_array($row->value) ? $row->value : [];
        return array_merge($defaults, array_intersect_key($value, $defaults));
    }

    public function updateDataRetention(array $payload): array
    {
        $defaults = $this->dataRetentionDefaults();
        $normalized = array_merge($defaults, array_intersect_key($payload, $defaults));

        $saved = SystemSetting::query()->updateOrCreate(
            ['key' => self::DATA_RETENTION_KEY],
            ['value' => $normalized],
        );

        return is_array($saved->value) ? array_merge($defaults, $saved->value) : $defaults;
    }

    public function resetDataRetention(): array
    {
        $defaults = $this->dataRetentionDefaults();

        SystemSetting::query()->updateOrCreate(
            ['key' => self::DATA_RETENTION_KEY],
            ['value' => $defaults],
        );

        return $defaults;
    }

    private function dataRetentionDefaults(): array
    {
        return [
            'audit_logs_days' => 365,
            'attendance_days' => 730,
            'employee_documents_days' => 3650,
            'reports_days' => 365,
            'api_logs_days' => 90,
            'auto_purge_enabled' => true,
        ];
    }

    private function notificationRulesDefaults(): array
    {
        $defaults = [];

        foreach (self::NOTIFICATION_EVENTS as $evt) {
            $id = (string) ($evt['id'] ?? '');
            if ($id === '') {
                continue;
            }

            $defaults[$id] = [
                'in_app' => true,
                'email' => in_array($id, ['failed_login_attempts', 'geo_fence_violation'], true),
                'sms' => $id === 'failed_login_attempts',
            ];
        }

        return $defaults;
    }

    private function sanitizeNotificationRules(array $rules): array
    {
        $allowed = array_values(array_filter(array_map(static fn (array $e): string => (string) ($e['id'] ?? ''), self::NOTIFICATION_EVENTS)));
        $allowedLookup = array_fill_keys($allowed, true);

        $sanitized = [];
        foreach ($rules as $eventId => $channels) {
            $id = (string) $eventId;
            if ($id === '' || !isset($allowedLookup[$id]) || !is_array($channels)) {
                continue;
            }

            $sanitized[$id] = [
                'in_app' => (bool) ($channels['in_app'] ?? false),
                'email' => (bool) ($channels['email'] ?? false),
                'sms' => (bool) ($channels['sms'] ?? false),
            ];
        }

        return $sanitized;
    }
}
