<?php

declare(strict_types=1);

namespace App\Modules\Audit\Services;

use App\Modules\Audit\Models\AuditLog;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class AuditLogService
{
    public function paginate(array $filters, int $perPage = 50): LengthAwarePaginator
    {
        $query = AuditLog::query()
            ->leftJoin('users', 'users.id', '=', 'audit_logs.user_id')
            ->distinct()
            ->select([
                'audit_logs.*',
                'users.name as actor_name',
                'users.email as actor_email',
            ]);

        if (!empty($filters['user_id'])) {
            $query->where('user_id', (int) $filters['user_id']);
        }

        if (!empty($filters['action'])) {
            $query->where('action', (string) $filters['action']);
        }

        if (!empty($filters['category']) && is_string($filters['category']) && $filters['category'] !== 'all') {
            $category = (string) $filters['category'];

            if ($category === 'policy') {
                $query->where(function ($q): void {
                    $q->where('action', 'like', 'policy.%')
                        ->orWhere('action', 'like', 'role.%')
                        ->orWhere('action', 'like', 'permission.%');
                });
            }

            if ($category === 'security') {
                $query->where(function ($q): void {
                    $q->where('action', 'like', 'auth.%')
                        ->orWhere('action', 'like', 'device.%')
                        ->orWhere('action', 'like', 'security.%');
                });
            }

            if ($category === 'export') {
                $query->where(function ($q): void {
                    $q->where('action', 'like', 'export.%')
                        ->orWhere('action', 'like', '%export%')
                        ->orWhere('action', 'like', '%backup%');
                });
            }
        }

        if (!empty($filters['model_type'])) {
            $query->where('model_type', (string) $filters['model_type']);
        }

        if (!empty($filters['model_id'])) {
            $query->where('model_id', (int) $filters['model_id']);
        }

        if (!empty($filters['search']) && is_string($filters['search']) && trim($filters['search']) !== '') {
            $search = trim($filters['search']);

            $query->where(function ($q) use ($search): void {
                $q->where('users.name', 'like', '%'.$search.'%')
                    ->orWhere('users.email', 'like', '%'.$search.'%')
                    ->orWhere('audit_logs.ip_address', 'like', '%'.$search.'%')
                    ->orWhere('audit_logs.action', 'like', '%'.$search.'%');

                if (preg_match('/^\d+$/', $search)) {
                    $q->orWhere('audit_logs.id', (int) $search);
                }
            });
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
