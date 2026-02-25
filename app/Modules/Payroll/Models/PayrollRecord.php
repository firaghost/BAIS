<?php

declare(strict_types=1);

namespace App\Modules\Payroll\Models;

use App\Models\User;
use App\Modules\Employees\Models\Employee;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayrollRecord extends Model
{
    protected $table = 'payroll_records';

    protected $fillable = [
        'user_id',
        'employee_id',
        'month',
        'total_work_days',
        'total_late_minutes',
        'total_overtime_minutes',
        'deduction_amount',
    ];

    protected $casts = [
        'user_id' => 'int',
        'employee_id' => 'int',
        'total_work_days' => 'int',
        'total_late_minutes' => 'int',
        'total_overtime_minutes' => 'int',
        'deduction_amount' => 'decimal:2',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }
}
