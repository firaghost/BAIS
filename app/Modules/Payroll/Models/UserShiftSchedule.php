<?php

declare(strict_types=1);

namespace App\Modules\Payroll\Models;

use App\Models\User;
use App\Modules\Employees\Models\Employee;
use App\Modules\Shifts\Models\Shift;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserShiftSchedule extends Model
{
    protected $table = 'user_shift_schedules';

    protected $fillable = [
        'user_id',
        'employee_id',
        'shift_id',
        'day_of_week',
        'is_active',
    ];

    protected $casts = [
        'user_id' => 'int',
        'employee_id' => 'int',
        'shift_id' => 'int',
        'day_of_week' => 'int',
        'is_active' => 'bool',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }

    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class, 'shift_id');
    }
}
