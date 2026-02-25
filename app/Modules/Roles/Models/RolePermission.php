<?php

declare(strict_types=1);

namespace App\Modules\Roles\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class RolePermission extends Pivot
{
    protected $table = 'role_permission';

    public $timestamps = false;

    protected $fillable = [
        'role_id',
        'permission_id',
    ];
}
