<?php

declare(strict_types=1);

namespace App\Modules\Leaves\Models;

use App\Modules\Employees\Models\Employee;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeaveCredit extends Model
{
    protected $table = 'leave_credits';

    protected $fillable = [
        'employee_id',
        'year',
        'leave_type',
        'total_days',
        'used_days',
    ];

    protected $casts = [
        'employee_id' => 'int',
        'year' => 'int',
        'total_days' => 'int',
        'used_days' => 'int',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }

    public function remainingDays(): int
    {
        return max(0, $this->total_days - $this->used_days);
    }
}
