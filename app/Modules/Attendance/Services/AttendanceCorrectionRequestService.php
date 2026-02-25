<?php

declare(strict_types=1);

namespace App\Modules\Attendance\Services;

use App\Models\User;
use App\Modules\Attendance\Models\AttendanceCorrectionRequest;
use App\Modules\Attendance\Models\AttendanceLog;
use App\Modules\Audit\Services\AuditWriterService;
use App\Modules\Employees\Models\Employee;
use App\Modules\Shifts\Models\Shift;
use Illuminate\Database\DatabaseManager;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AttendanceCorrectionRequestService
{
    public function __construct(
        private readonly DatabaseManager $db,
        private readonly AuditWriterService $auditWriter,
    ) {
    }

    public function index(User $actor, int $perPage): LengthAwarePaginator
    {
        $query = AttendanceCorrectionRequest::query()
            ->with(['attendanceLog', 'user', 'employee', 'reviewer'])
            ->orderByDesc('created_at');

        if ($actor->hasPermission('attendance.corrections.manage') || $actor->hasPermission('attendance.corrections.review')) {
            return $query->paginate($perPage);
        }

        return $query
            ->where('user_id', $actor->id)
            ->paginate($perPage);
    }

    public function create(User $actor, array $data, ?string $ipAddress): AttendanceCorrectionRequest
    {
        return $this->db->transaction(function () use ($actor, $data, $ipAddress): AttendanceCorrectionRequest {
            $log = AttendanceLog::query()->findOrFail((int) $data['attendance_log_id']);

            if ($log->user_id !== $actor->id && !$actor->hasPermission('attendance.corrections.manage')) {
                throw new HttpException(403, 'Forbidden.');
            }

            $employeeId = Employee::query()->where('user_id', $actor->id)->value('id');

            $request = AttendanceCorrectionRequest::query()->create([
                'attendance_log_id' => $log->id,
                'user_id' => $actor->id,
                'employee_id' => $employeeId,
                'proposed_check_in_time' => $data['proposed_check_in_time'] ?? null,
                'proposed_check_out_time' => $data['proposed_check_out_time'] ?? null,
                'status' => 'pending',
                'reason' => (string) $data['reason'],
            ]);

            $this->auditWriter->log(
                $actor->id,
                'attendance.correction_requested',
                AttendanceCorrectionRequest::class,
                $request->id,
                null,
                $request->toArray(),
                $ipAddress,
            );

            return $request;
        });
    }

    public function approve(
        AttendanceCorrectionRequest $request,
        User $reviewer,
        ?string $comment,
        ?string $ipAddress,
    ): AttendanceCorrectionRequest {
        return $this->db->transaction(function () use ($request, $reviewer, $comment, $ipAddress): AttendanceCorrectionRequest {
            $request->refresh();

            if ($request->status !== 'pending') {
                throw new HttpException(409, 'Request already reviewed.');
            }

            $log = AttendanceLog::query()->findOrFail($request->attendance_log_id);
            $oldLog = $log->toArray();

            if ($request->proposed_check_in_time) {
                $log->check_in_time = $request->proposed_check_in_time;
            }

            if ($request->proposed_check_out_time !== null) {
                $log->check_out_time = $request->proposed_check_out_time;
            }

            if ($log->check_in_time && $log->check_out_time && $log->check_out_time->lessThan($log->check_in_time)) {
                throw new HttpException(422, 'Invalid check-out time.');
            }

            $shift = $this->resolveShiftForBranch((int) $log->branch_id);
            $log->late_minutes = $this->calculateLateMinutesForDate($log->check_in_time, $log->log_date, $shift);
            $log->overtime_minutes = $this->calculateOvertimeMinutesForDate($log->check_out_time, $log->log_date, $shift);
            $log->status = $log->check_out_time ? 'checked_out' : 'checked_in';
            $log->save();

            $request->status = 'approved';
            $request->reviewed_by = $reviewer->id;
            $request->reviewed_at = now();
            $request->review_comment = $comment;
            $request->save();

            $this->auditWriter->log(
                $reviewer->id,
                'attendance.correction_approved',
                AttendanceCorrectionRequest::class,
                $request->id,
                ['status' => 'pending'],
                $request->toArray(),
                $ipAddress,
            );

            $this->auditWriter->log(
                $reviewer->id,
                'attendance.corrected',
                AttendanceLog::class,
                $log->id,
                $oldLog,
                $log->toArray(),
                $ipAddress,
            );

            return $request;
        });
    }

    public function reject(
        AttendanceCorrectionRequest $request,
        User $reviewer,
        ?string $comment,
        ?string $ipAddress,
    ): AttendanceCorrectionRequest {
        return $this->db->transaction(function () use ($request, $reviewer, $comment, $ipAddress): AttendanceCorrectionRequest {
            $request->refresh();

            if ($request->status !== 'pending') {
                throw new HttpException(409, 'Request already reviewed.');
            }

            $request->status = 'rejected';
            $request->reviewed_by = $reviewer->id;
            $request->reviewed_at = now();
            $request->review_comment = $comment;
            $request->save();

            $this->auditWriter->log(
                $reviewer->id,
                'attendance.correction_rejected',
                AttendanceCorrectionRequest::class,
                $request->id,
                ['status' => 'pending'],
                $request->toArray(),
                $ipAddress,
            );

            return $request;
        });
    }

    private function resolveShiftForBranch(int $branchId): Shift
    {
        $shift = Shift::query()
            ->where('branch_id', $branchId)
            ->orderBy('start_time')
            ->first();

        if (!$shift) {
            throw new HttpException(422, 'No shift configured for this branch.');
        }

        return $shift;
    }

    private function calculateLateMinutesForDate(?Carbon $checkIn, $logDate, Shift $shift): int
    {
        if (!$checkIn) {
            return 0;
        }

        $start = $this->dateTimeOnLogDate($logDate, $shift->start_time);
        $lateFrom = $start->copy()->addMinutes((int) $shift->grace_minutes);

        if ($checkIn->lessThanOrEqualTo($lateFrom)) {
            return 0;
        }

        return (int) $lateFrom->diffInMinutes($checkIn);
    }

    private function calculateOvertimeMinutesForDate(?Carbon $checkOut, $logDate, Shift $shift): int
    {
        if (!$checkOut) {
            return 0;
        }

        $end = $this->dateTimeOnLogDate($logDate, $shift->end_time);
        $overtimeFrom = $end->copy()->addMinutes((int) $shift->overtime_threshold);

        if ($checkOut->lessThanOrEqualTo($overtimeFrom)) {
            return 0;
        }

        return (int) $overtimeFrom->diffInMinutes($checkOut);
    }

    private function dateTimeOnLogDate($logDate, string $time): Carbon
    {
        $date = $logDate instanceof Carbon ? $logDate->toDateString() : (string) $logDate;

        return Carbon::parse($date.' '.$time);
    }
}
