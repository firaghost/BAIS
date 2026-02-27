<?php

declare(strict_types=1);

namespace App\Modules\Leaves\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Employees\Models\Employee;
use App\Modules\Leaves\Models\LeaveCredit;
use App\Modules\Leaves\Requests\LeaveCreditBulkSetRequest;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\DatabaseManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeaveCreditController extends Controller
{
    public function __construct(private readonly DatabaseManager $db)
    {
    }

    public function bulkSet(LeaveCreditBulkSetRequest $request): JsonResponse
    {
        $actor = $request->user();

        if (!$actor) {
            throw new AuthenticationException('Unauthenticated.');
        }

        if (!$actor->hasRole('super-admin') && !$actor->hasRole('hr-admin')) {
            abort(403, 'Forbidden.');
        }

        $data = $request->payload();
        $year = (int) $data['year'];
        $leaveType = (string) $data['leave_type'];
        $totalDays = (int) $data['total_days'];
        $applyToAll = (bool) ($data['apply_to_all'] ?? false);

        $employeeIds = [];
        if (!$applyToAll) {
            $employeeIds = array_values(array_unique(array_map('intval', $data['employee_ids'] ?? [])));
            $employeeIds = array_values(array_filter($employeeIds, static fn (int $id): bool => $id > 0));

            if ($employeeIds === []) {
                return response()->json(['message' => 'No employees selected.'], 422);
            }
        }

        $updated = $this->db->transaction(function () use ($applyToAll, $employeeIds, $year, $leaveType, $totalDays): int {
            $targetEmployeeIds = $applyToAll
                ? Employee::query()->pluck('id')->all()
                : $employeeIds;

            $count = 0;

            foreach ($targetEmployeeIds as $employeeId) {
                $employeeId = (int) $employeeId;
                if ($employeeId <= 0) {
                    continue;
                }

                $credit = LeaveCredit::query()->firstOrNew([
                    'employee_id' => $employeeId,
                    'year' => $year,
                    'leave_type' => $leaveType,
                ]);

                $credit->total_days = $totalDays;

                if ($credit->used_days > $credit->total_days) {
                    $credit->used_days = $credit->total_days;
                }

                $credit->save();
                $count++;
            }

            return $count;
        });

        return response()->json([
            'data' => [
                'updated' => $updated,
            ],
        ]);
    }

    public function employeeCredits(Request $request, int $employeeId): JsonResponse
    {
        $actor = $request->user();

        if (!$actor) {
            throw new AuthenticationException('Unauthenticated.');
        }

        if (!$actor->hasRole('super-admin') && !$actor->hasRole('hr-admin')) {
            abort(403, 'Forbidden.');
        }

        $year = (int) $request->input('year', now()->year);

        $rows = LeaveCredit::query()
            ->where('employee_id', $employeeId)
            ->where('year', $year)
            ->orderBy('leave_type')
            ->get();

        return response()->json([
            'data' => $rows,
        ]);
    }
}
