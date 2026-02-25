<?php

declare(strict_types=1);

namespace App\Modules\Audit\Services;

use App\Modules\Audit\Models\AuditLog;

class AuditWriterService
{
    public function log(
        int $actorUserId,
        string $action,
        string $modelType,
        ?int $modelId,
        ?array $oldValues,
        ?array $newValues,
        ?string $ipAddress,
    ): AuditLog {
        return AuditLog::query()->create([
            'user_id' => $actorUserId,
            'action' => $action,
            'model_type' => $modelType,
            'model_id' => $modelId,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => $ipAddress,
        ]);
    }
}
