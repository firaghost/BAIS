<?php

declare(strict_types=1);

namespace App\Modules\Holidays\Models;

use Illuminate\Database\Eloquent\Model;

class Holiday extends Model
{
    protected $table = 'holidays';

    protected $fillable = [
        'country_code',
        'holiday_date',
        'name',
        'type',
        'is_active',
        'source',
        'created_by',
    ];

    protected $casts = [
        'holiday_date' => 'date',
        'is_active' => 'bool',
        'created_by' => 'int',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
}
