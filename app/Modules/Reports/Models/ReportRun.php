<?php

declare(strict_types=1);

namespace App\Modules\Reports\Models;

use Illuminate\Database\Eloquent\Model;

class ReportRun extends Model
{
    protected $table = 'report_runs';

    protected $fillable = [
        'name',
        'trigger',
        'format',
        'status',
        'branch_id',
        'from_date',
        'to_date',
        'created_by_user_id',
        'template_id',
        'definition',
        'result',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'branch_id' => 'int',
        'template_id' => 'int',
        'created_by_user_id' => 'int',
        'from_date' => 'date',
        'to_date' => 'date',
        'definition' => 'array',
        'result' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
}
