<?php

declare(strict_types=1);

namespace App\Modules\Branches\Models;

use Illuminate\Database\Eloquent\Model;

class Branch extends Model
{
    protected $table = 'branches';

    protected $fillable = [
        'branch_code',
        'name',
        'address_line',
        'city',
        'state',
        'manager_employee_id',
        'latitude',
        'longitude',
        'radius_meters',
    ];

    protected $casts = [
        'manager_employee_id' => 'int',
        'latitude' => 'float',
        'longitude' => 'float',
        'radius_meters' => 'int',
    ];
}
