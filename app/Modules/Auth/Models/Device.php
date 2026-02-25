<?php

declare(strict_types=1);

namespace App\Modules\Auth\Models;

use Illuminate\Database\Eloquent\Model;

class Device extends Model
{
    protected $table = 'devices';

    public const CREATED_AT = 'created_at';
    public const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'employee_id',
        'device_identifier',
        'device_name',
        'is_active',
        'created_at',
    ];

    protected $casts = [
        'user_id' => 'int',
        'employee_id' => 'int',
        'is_active' => 'boolean',
        'created_at' => 'datetime',
    ];
}
