<?php

declare(strict_types=1);

namespace App\Modules\Attendance\Models;

use App\Models\User;
use App\Modules\Branches\Models\Branch;
use App\Modules\Employees\Models\Employee;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceLog extends Model
{
    protected $table = 'attendance_logs';

    protected $fillable = [
        'user_id',
        'employee_id',
        'branch_id',
        'log_date',
        'check_in_time',
        'check_out_time',
        'late_minutes',
        'late_excused',
        'overtime_minutes',
        'status',
    ];

    protected $casts = [
        'user_id' => 'int',
        'employee_id' => 'int',
        'branch_id' => 'int',
        'log_date' => 'date',
        'check_in_time' => 'datetime',
        'check_out_time' => 'datetime',
        'late_minutes' => 'int',
        'late_excused' => 'bool',
        'overtime_minutes' => 'int',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }
}
