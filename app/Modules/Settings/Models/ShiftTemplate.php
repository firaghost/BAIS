<?php

declare(strict_types=1);

namespace App\Modules\Settings\Models;

use Illuminate\Database\Eloquent\Model;

class ShiftTemplate extends Model
{
    protected $table = 'shift_templates';

    protected $fillable = [
        'code',
        'name',
        'start_time',
        'end_time',
        'break_minutes',
        'status',
        'archived_at',
    ];

    protected $casts = [
        'break_minutes' => 'int',
        'archived_at' => 'datetime',
        'start_time' => 'string',
        'end_time' => 'string',
    ];
}
