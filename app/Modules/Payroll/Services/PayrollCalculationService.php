<?php

declare(strict_types=1);

namespace App\Modules\Payroll\Services;

use App\Models\User;
use App\Modules\Attendance\Models\AttendanceLog;
use App\Modules\Audit\Services\AuditWriterService;
use App\Modules\Employees\Models\Employee;
use App\Modules\Payroll\Models\PayrollRecord;
use App\Modules\Payroll\Models\UserShiftSchedule;
use Illuminate\Database\DatabaseManager;
use Illuminate\Support\Carbon;

class PayrollCalculationService
{
    public function __construct(
        private readonly DatabaseManager $db,
        private readonly AuditWriterService $auditWriter,
    ) {
    }

    public function generateForUserMonth(User $actor, User $targetUser, string $month, ?string $ipAddress): PayrollRecord
    {
        $start = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
        $end = $start->copy()->endOfMonth();

        $employeeId = Employee::query()
            ->where('user_id', $targetUser->id)
            ->value('id');

        return $this->db->transaction(function () use ($actor, $targetUser, $employeeId, $month, $start, $end, $ipAddress): PayrollRecord {
            $old = PayrollRecord::query()
                ->where('user_id', $targetUser->id)
                ->where('month', $month)
                ->first();

            $scheduledWorkDays = $this->scheduledWorkDaysForMonth($targetUser->id, $start, $end);

            $attendanceAgg = AttendanceLog::query()
                ->where('user_id', $targetUser->id)
                ->whereBetween('check_in_time', [$start, $end])
                ->selectRaw('COUNT(DISTINCT log_date) as days')
                ->selectRaw('COALESCE(SUM(late_minutes),0) as late_minutes')
                ->selectRaw('COALESCE(SUM(overtime_minutes),0) as overtime_minutes')
                ->first();

            $attendanceDays = (int) ($attendanceAgg->days ?? 0);
            $totalLateMinutes = (int) ($attendanceAgg->late_minutes ?? 0);
            $totalOvertimeMinutes = (int) ($attendanceAgg->overtime_minutes ?? 0);

            $workDays = $scheduledWorkDays > 0 ? $scheduledWorkDays : $attendanceDays;

            $freeLateMinutes = 30;
            $chargeableLate = max(0, $totalLateMinutes - $freeLateMinutes);

            $deductionAmount = (float) $chargeableLate;

            $record = PayrollRecord::query()->updateOrCreate(
                ['user_id' => $targetUser->id, 'month' => $month],
                [
                    'employee_id' => $employeeId,
                    'total_work_days' => $workDays,
                    'total_late_minutes' => $totalLateMinutes,
                    'total_overtime_minutes' => $totalOvertimeMinutes,
                    'deduction_amount' => $deductionAmount,
                ],
            );

            $this->auditWriter->log(
                $actor->id,
                'payroll.generated',
                PayrollRecord::class,
                $record->id,
                $old ? $old->toArray() : null,
                $record->toArray(),
                $ipAddress,
            );

            return $record;
        });
    }

    private function scheduledWorkDaysForMonth(int $userId, Carbon $start, Carbon $end): int
    {
        $dayOfWeekSet = UserShiftSchedule::query()
            ->where('user_id', $userId)
            ->where('is_active', true)
            ->pluck('day_of_week')
            ->map(fn ($d) => (int) $d)
            ->unique()
            ->values()
            ->all();

        if (count($dayOfWeekSet) === 0) {
            return 0;
        }

        $count = 0;
        $cursor = $start->copy()->startOfDay();

        while ($cursor->lessThanOrEqualTo($end)) {
            $dow = (int) $cursor->dayOfWeek;

            if (in_array($dow, $dayOfWeekSet, true)) {
                $count++;
            }

            $cursor->addDay();
        }

        return $count;
    }
}
