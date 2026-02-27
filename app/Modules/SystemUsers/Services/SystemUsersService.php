<?php

declare(strict_types=1);

namespace App\Modules\SystemUsers\Services;

use App\Models\User;
use App\Modules\Audit\Services\AuditWriterService;
use App\Modules\Roles\Models\Role;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\DatabaseManager;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class SystemUsersService
{
    public function __construct(
        private readonly DatabaseManager $db,
        private readonly AuditWriterService $auditWriter,
    ) {
    }

    public function listRoles(): array
    {
        return Role::query()
            ->select(['id', 'name', 'slug'])
            ->orderBy('name')
            ->get()
            ->toArray();
    }

    public function listUsers(string $search, ?int $roleId, int $page, int $perPage): array
    {
        $page = $page > 0 ? $page : 1;
        $perPage = $perPage > 0 && $perPage <= 50 ? $perPage : 10;

        $hasIsActive = Schema::hasColumn('users', 'is_active');
        $hasAccessScopeType = Schema::hasColumn('users', 'access_scope_type');
        $hasAccessScopeBranchId = Schema::hasColumn('users', 'access_scope_branch_id');
        $hasAccessScopeRegion = Schema::hasColumn('users', 'access_scope_region');

        $select = [
            'users.id as id',
            'users.name as name',
            'users.email as email',
            'users.must_change_password as must_change_password',
            $hasIsActive ? 'users.is_active as is_active' : DB::raw('1 as is_active'),
            $hasAccessScopeType ? 'users.access_scope_type' : DB::raw("'global' as access_scope_type"),
            $hasAccessScopeBranchId ? 'users.access_scope_branch_id' : DB::raw('NULL as access_scope_branch_id'),
            $hasAccessScopeRegion ? 'users.access_scope_region' : DB::raw("'' as access_scope_region"),
        ];

        $query = User::query();

        if ($hasAccessScopeBranchId) {
            $query->leftJoin('branches', 'branches.id', '=', 'users.access_scope_branch_id');
            $select[] = 'branches.name as access_scope_branch_name';
        } else {
            $select[] = DB::raw("'' as access_scope_branch_name");
        }

        $query->select($select)
            ->selectSub(
                Role::query()
                    ->select('roles.id')
                    ->join('user_role', 'user_role.role_id', '=', 'roles.id')
                    ->whereColumn('user_role.user_id', 'users.id')
                    ->orderBy('roles.id')
                    ->limit(1),
                'primary_role_id',
            )
            ->selectSub(
                Role::query()
                    ->select('roles.name')
                    ->join('user_role', 'user_role.role_id', '=', 'roles.id')
                    ->whereColumn('user_role.user_id', 'users.id')
                    ->orderBy('roles.id')
                    ->limit(1),
                'primary_role_name',
            )
            ->selectSub(
                Role::query()
                    ->select('roles.slug')
                    ->join('user_role', 'user_role.role_id', '=', 'roles.id')
                    ->whereColumn('user_role.user_id', 'users.id')
                    ->orderBy('roles.id')
                    ->limit(1),
                'primary_role_slug',
            );

        if ($search !== '') {
            $query->where(function (Builder $q) use ($search): void {
                $q->where('users.name', 'like', '%'.$search.'%')
                    ->orWhere('users.email', 'like', '%'.$search.'%');
            });
        }

        if ($roleId !== null && $roleId > 0) {
            $query->whereExists(function ($sub) use ($roleId): void {
                $sub->selectRaw('1')
                    ->from('user_role')
                    ->whereColumn('user_role.user_id', 'users.id')
                    ->where('user_role.role_id', '=', $roleId);
            });
        }

        $paginator = $query
            ->orderBy('users.name')
            ->paginate($perPage, ['*'], 'page', $page);

        $items = array_map(function ($row): array {
            $row = is_array($row) ? $row : (array) $row;
            $type = (string) ($row['access_scope_type'] ?? 'global');
            $scope = 'Global (All Branches)';

            if ($type === 'branch') {
                $scope = (string) ($row['access_scope_branch_name'] ?? 'Branch');
            } elseif ($type === 'regional') {
                $scope = (string) ($row['access_scope_region'] ?? 'Region');
            }

            return [
                'id' => (int) ($row['id'] ?? 0),
                'name' => (string) ($row['name'] ?? ''),
                'email' => (string) ($row['email'] ?? ''),
                'primary_role_id' => (int) ($row['primary_role_id'] ?? 0),
                'primary_role_name' => (string) ($row['primary_role_name'] ?? ''),
                'primary_role_slug' => (string) ($row['primary_role_slug'] ?? ''),
                'scope_label' => $scope,
                'access_scope_type' => (string) ($row['access_scope_type'] ?? 'global'),
                'access_scope_branch_id' => is_numeric($row['access_scope_branch_id'] ?? null) ? (int) $row['access_scope_branch_id'] : null,
                'access_scope_region' => (string) ($row['access_scope_region'] ?? ''),
                'status' => $this->statusLabel(
                    (bool) ($row['is_active'] ?? true),
                    (bool) ($row['must_change_password'] ?? false),
                ),
            ];
        }, $paginator->items());

        return [
            'data' => $items,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ];
    }

    public function updateUser(User $actor, User $target, array $payload, ?string $ipAddress): array
    {
        return $this->db->transaction(function () use ($actor, $target, $payload, $ipAddress): array {
            $old = [
                'name' => $target->name,
                'access_scope_type' => $target->access_scope_type,
                'access_scope_branch_id' => $target->access_scope_branch_id,
                'access_scope_region' => $target->access_scope_region,
                'role_ids' => $target->roles()->pluck('roles.id')->all(),
            ];

            $target->update([
                'name' => (string) ($payload['name'] ?? $target->name),
                'access_scope_type' => (string) ($payload['access_scope_type'] ?? $target->access_scope_type),
                'access_scope_branch_id' => $payload['access_scope_branch_id'] ?? null,
                'access_scope_region' => $payload['access_scope_region'] ?? null,
            ]);

            $role = Role::query()->findOrFail((int) ($payload['role_id'] ?? 0));
            $target->roles()->sync([$role->id]);

            $new = [
                'name' => $target->name,
                'access_scope_type' => $target->access_scope_type,
                'access_scope_branch_id' => $target->access_scope_branch_id,
                'access_scope_region' => $target->access_scope_region,
                'role_ids' => $target->roles()->pluck('roles.id')->all(),
                'primary_role_id' => $role->id,
            ];

            $this->auditWriter->log(
                $actor->id,
                'system_user.updated',
                User::class,
                $target->id,
                $old,
                $new,
                $ipAddress,
            );

            return [
                'id' => $target->id,
                'name' => $target->name,
                'email' => $target->email,
                'access_scope_type' => $target->access_scope_type,
                'access_scope_branch_id' => $target->access_scope_branch_id,
                'access_scope_region' => $target->access_scope_region,
                'primary_role_id' => $role->id,
                'primary_role_name' => $role->name,
                'primary_role_slug' => $role->slug,
            ];
        });
    }

    public function setActive(User $actor, User $target, bool $active, ?string $ipAddress): void
    {
        $this->db->transaction(function () use ($actor, $target, $active, $ipAddress): void {
            $old = ['is_active' => (bool) $target->is_active];

            User::query()->whereKey($target->id)->update(['is_active' => $active]);

            $this->auditWriter->log(
                $actor->id,
                $active ? 'system_user.activated' : 'system_user.deactivated',
                User::class,
                $target->id,
                $old,
                ['is_active' => $active],
                $ipAddress,
            );
        });
    }

    private function statusLabel(bool $isActive, bool $mustChangePassword): string
    {
        if (!$isActive) {
            return 'inactive';
        }

        if ($mustChangePassword) {
            return 'pending';
        }

        return 'active';
    }

    public function createUser(User $actor, array $payload, ?string $ipAddress): array
    {
        return $this->db->transaction(function () use ($actor, $payload, $ipAddress): array {
            $tempPassword = Str::password(16);

            $user = User::query()->create([
                'name' => (string) ($payload['name'] ?? ''),
                'email' => (string) ($payload['email'] ?? ''),
                'password' => Hash::make($tempPassword),
                'must_change_password' => true,
                'is_active' => true,
                'access_scope_type' => (string) ($payload['access_scope_type'] ?? 'global'),
                'access_scope_branch_id' => $payload['access_scope_branch_id'] ?? null,
                'access_scope_region' => $payload['access_scope_region'] ?? null,
            ]);

            $role = Role::query()->findOrFail((int) ($payload['role_id'] ?? 0));
            $user->roles()->syncWithoutDetaching([$role->id]);

            $this->auditWriter->log(
                $actor->id,
                'system_user.created',
                User::class,
                $user->id,
                null,
                [
                    'email' => $user->email,
                    'role_id' => $role->id,
                    'access_scope_type' => $user->access_scope_type,
                    'access_scope_branch_id' => $user->access_scope_branch_id,
                    'access_scope_region' => $user->access_scope_region,
                ],
                $ipAddress,
            );

            return [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'must_change_password' => true,
                    'access_scope_type' => $user->access_scope_type,
                    'access_scope_branch_id' => $user->access_scope_branch_id,
                    'access_scope_region' => $user->access_scope_region,
                ],
                'temporary_password' => $tempPassword,
            ];
        });
    }
}
