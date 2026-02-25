<?php

declare(strict_types=1);

namespace App\Modules\Shifts\Models;

use App\Modules\Branches\Models\Branch;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Shift extends Model
{
    protected $table = 'shifts';

    protected $fillable = [
        'branch_id',
        'start_time',
        'end_time',
        'grace_minutes',
        'overtime_threshold',
    ];

    protected $casts = [
        'branch_id' => 'int',
        'grace_minutes' => 'int',
        'overtime_threshold' => 'int',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }
}
