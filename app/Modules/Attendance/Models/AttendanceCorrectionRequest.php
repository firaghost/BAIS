<?php

declare(strict_types=1);

namespace App\Modules\Attendance\Models;

use App\Models\User;
use App\Modules\Attendance\Models\AttendanceLog;
use App\Modules\Employees\Models\Employee;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceCorrectionRequest extends Model
{
    protected $table = 'attendance_correction_requests';

    protected $fillable = [
        'attendance_log_id',
        'user_id',
        'employee_id',
        'proposed_check_in_time',
        'proposed_check_out_time',
        'status',
        'reason',
        'reviewed_by',
        'reviewed_at',
        'review_comment',
    ];

    protected $casts = [
        'attendance_log_id' => 'int',
        'user_id' => 'int',
        'employee_id' => 'int',
        'proposed_check_in_time' => 'datetime',
        'proposed_check_out_time' => 'datetime',
        'reviewed_by' => 'int',
        'reviewed_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function attendanceLog(): BelongsTo
    {
        return $this->belongsTo(AttendanceLog::class, 'attendance_log_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
