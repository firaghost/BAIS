<?php

declare(strict_types=1);

namespace App\Modules\Employees\Models;

use App\Models\User;
use App\Modules\Branches\Models\Branch;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Employee extends Model
{
    protected $table = 'employees';

    protected $fillable = [
        'employee_code',
        'join_year',
        'sequence',
        'user_id',
        'branch_id',
        'first_name',
        'middle_name',
        'last_name',
        'phone',
        'email',
        'job_title',
        'department',
        'hire_date',
        'status',
        'photo_path',
    ];

    protected $casts = [
        'join_year' => 'int',
        'sequence' => 'int',
        'user_id' => 'int',
        'branch_id' => 'int',
        'hire_date' => 'date',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }
}
