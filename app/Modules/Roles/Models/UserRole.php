<?php

declare(strict_types=1);

namespace App\Modules\Roles\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class UserRole extends Pivot
{
    protected $table = 'user_role';

    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'role_id',
    ];
}
