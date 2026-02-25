<?php

declare(strict_types=1);

namespace App\Modules\Audit\Services;

use App\Modules\Audit\Models\AuditLog;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class AuditLogService
{
    public function paginate(array $filters, int $perPage = 50): LengthAwarePaginator
    {
        $query = AuditLog::query();

        if (!empty($filters['user_id'])) {
            $query->where('user_id', (int) $filters['user_id']);
        }

        if (!empty($filters['action'])) {
            $query->where('action', (string) $filters['action']);
        }

        if (!empty($filters['model_type'])) {
            $query->where('model_type', (string) $filters['model_type']);
        }

        if (!empty($filters['model_id'])) {
            $query->where('model_id', (int) $filters['model_id']);
        }

        if (!empty($filters['from'])) {
            $query->where('created_at', '>=', $filters['from']);
        }

        if (!empty($filters['to'])) {
            $query->where('created_at', '<=', $filters['to']);
        }

        return $query
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }
}
