<?php

declare(strict_types=1);

namespace App\Modules\Reports\Models;

use Illuminate\Database\Eloquent\Model;

class ReportTemplate extends Model
{
    protected $table = 'report_templates';

    protected $fillable = [
        'name',
        'description',
        'category',
        'default_format',
        'is_active',
        'definition',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'is_active' => 'bool',
        'definition' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
}
