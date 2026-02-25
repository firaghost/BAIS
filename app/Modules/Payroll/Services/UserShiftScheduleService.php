<?php

declare(strict_types=1);

namespace App\Modules\Payroll\Services;

use App\Models\User;
use App\Modules\Audit\Services\AuditWriterService;
use App\Modules\Employees\Models\Employee;
use App\Modules\Payroll\Models\UserShiftSchedule;
use Illuminate\Database\DatabaseManager;
use Illuminate\Pagination\LengthAwarePaginator;
use Symfony\Component\HttpKernel\Exception\HttpException;

class UserShiftScheduleService
{
    public function __construct(
        private readonly DatabaseManager $db,
        private readonly AuditWriterService $auditWriter,
    ) {
    }

    public function index(User $actor, ?int $userId, ?int $employeeId, int $perPage): LengthAwarePaginator
    {
        $query = UserShiftSchedule::query()->with(['user', 'employee', 'shift']);

        if ($actor->hasPermission('shift_schedules.manage')) {
            if ($employeeId) {
                $query->where('employee_id', $employeeId);
            }

            if ($userId) {
                $query->where('user_id', $userId);
            }
        } else {
            $query->where('user_id', $actor->id);
        }

        return $query
            ->orderBy('user_id')
            ->orderBy('day_of_week')
            ->paginate($perPage);
    }

    public function create(User $actor, array $data, string $reason, ?string $ipAddress): UserShiftSchedule
    {
        return $this->db->transaction(function () use ($actor, $data, $reason, $ipAddress): UserShiftSchedule {
            $userId = $data['user_id'] ?? null;
            $employeeId = $data['employee_id'] ?? null;

            if (!$userId && $employeeId) {
                $userId = Employee::query()->where('id', (int) $employeeId)->value('user_id');

                if (!$userId) {
                    throw new HttpException(422, 'Employee is not linked to a user.');
                }
            }

            if (!$employeeId && $userId) {
                $employeeId = Employee::query()->where('user_id', (int) $userId)->value('id');
            }

            if (!$userId) {
                throw new HttpException(422, 'Missing user_id.');
            }

            $schedule = UserShiftSchedule::query()->create([
                'user_id' => (int) $userId,
                'employee_id' => $employeeId ? (int) $employeeId : null,
                'shift_id' => (int) $data['shift_id'],
                'day_of_week' => (int) $data['day_of_week'],
                'is_active' => array_key_exists('is_active', $data) ? (bool) $data['is_active'] : true,
            ]);

            $new = $schedule->toArray();
            $new['reason'] = $reason;

            $this->auditWriter->log(
                $actor->id,
                'shift_schedule.created',
                UserShiftSchedule::class,
                $schedule->id,
                null,
                $new,
                $ipAddress,
            );

            return $schedule;
        });
    }

    public function update(User $actor, UserShiftSchedule $schedule, array $data, string $reason, ?string $ipAddress): UserShiftSchedule
    {
        return $this->db->transaction(function () use ($actor, $schedule, $data, $reason, $ipAddress): UserShiftSchedule {
            $old = $schedule->toArray();

            unset($data['reason']);
            $schedule->fill($data);
            $schedule->save();

            $new = $schedule->toArray();
            $new['reason'] = $reason;

            $this->auditWriter->log(
                $actor->id,
                'shift_schedule.updated',
                UserShiftSchedule::class,
                $schedule->id,
                $old,
                $new,
                $ipAddress,
            );

            return $schedule;
        });
    }

    public function delete(User $actor, UserShiftSchedule $schedule, string $reason, ?string $ipAddress): void
    {
        $this->db->transaction(function () use ($actor, $schedule, $reason, $ipAddress): void {
            $old = $schedule->toArray();
            $old['reason'] = $reason;

            $schedule->delete();

            $this->auditWriter->log(
                $actor->id,
                'shift_schedule.deleted',
                UserShiftSchedule::class,
                $schedule->id,
                $old,
                null,
                $ipAddress,
            );
        });
    }
}
