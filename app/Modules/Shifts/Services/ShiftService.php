<?php

declare(strict_types=1);

namespace App\Modules\Shifts\Services;

use App\Modules\Shifts\Models\Shift;

class ShiftService
{
    public function create(array $data): Shift
    {
        return Shift::query()->create([
            'branch_id' => (int) $data['branch_id'],
            'start_time' => (string) $data['start_time'],
            'end_time' => (string) $data['end_time'],
            'grace_minutes' => (int) $data['grace_minutes'],
            'overtime_threshold' => (int) $data['overtime_threshold'],
        ]);
    }

    public function update(Shift $shift, array $data): Shift
    {
        $shift->fill($data);
        $shift->save();

        return $shift;
    }

    public function delete(Shift $shift): void
    {
        $shift->delete();
    }
}
