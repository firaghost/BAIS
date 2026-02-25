<?php

declare(strict_types=1);

namespace App\Modules\Leaves\Models;

use App\Models\User;
use App\Modules\Employees\Models\Employee;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeaveRequest extends Model
{
    protected $table = 'leave_requests';

    protected $fillable = [
        'user_id',
        'employee_id',
        'leave_type',
        'start_date',
        'end_date',
        'status',
        'approved_by',
        'manager_approved_by',
        'manager_approved_at',
        'hr_approved_by',
        'hr_approved_at',
        'reason',
        'rejection_reason',
    ];

    protected $casts = [
        'user_id' => 'int',
        'employee_id' => 'int',
        'start_date' => 'date',
        'end_date' => 'date',
        'approved_by' => 'int',
        'manager_approved_by' => 'int',
        'manager_approved_at' => 'datetime',
        'hr_approved_by' => 'int',
        'hr_approved_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function managerApprover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'manager_approved_by');
    }

    public function hrApprover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'hr_approved_by');
    }
}
