<?php

declare(strict_types=1);

namespace App\Modules\HrAdmin\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\HrAdmin\Services\HrAdminAttendanceService;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AttendanceController extends Controller
{
    public function __construct(private readonly HrAdminAttendanceService $attendance)
    {
    }

    public function departments(Request $request): JsonResponse
    {
        $actor = $request->user();

        if (!$actor) {
            throw new AuthenticationException('Unauthenticated.');
        }

        return response()->json([
            'data' => $this->attendance->listDepartments($actor->id),
        ]);
    }

    public function employeeLookup(Request $request): JsonResponse
    {
        $actor = $request->user();

        if (!$actor) {
            throw new AuthenticationException('Unauthenticated.');
        }

        $validated = $request->validate([
            'search' => ['required', 'string', 'min:1', 'max:100'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:25'],
        ]);

        $search = trim((string) $validated['search']);
        $limit = isset($validated['limit']) ? (int) $validated['limit'] : 10;

        return response()->json([
            'data' => $this->attendance->employeeLookup($actor->id, $search, $limit),
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $actor = $request->user();

        if (!$actor) {
            throw new AuthenticationException('Unauthenticated.');
        }

        $validated = $request->validate([
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            'department' => ['nullable', 'string', 'max:150'],
            'status' => ['nullable', 'string', 'in:on_time,late,absent,exception'],
            'search' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $from = is_string(($validated['from'] ?? null)) ? $validated['from'] : now()->toDateString();
        $to = is_string(($validated['to'] ?? null)) ? $validated['to'] : $from;

        return response()->json([
            'data' => $this->attendance->listLogs(
                $actor->id,
                $from,
                $to,
                is_string(($validated['department'] ?? null)) ? trim($validated['department']) : null,
                is_string(($validated['status'] ?? null)) ? $validated['status'] : null,
                is_string(($validated['search'] ?? null)) ? trim($validated['search']) : '',
                isset($validated['page']) ? (int) $validated['page'] : 1,
                isset($validated['per_page']) ? (int) $validated['per_page'] : 20,
            ),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $actor = $request->user();

        if (!$actor) {
            throw new AuthenticationException('Unauthenticated.');
        }

        $validated = $request->validate([
            'employee_id' => ['required', 'integer', 'min:1'],
            'log_date' => ['required', 'date_format:Y-m-d'],
            'check_in_time' => ['required', 'date'],
            'check_out_time' => ['nullable', 'date', 'after_or_equal:check_in_time'],
            'reason' => ['required', 'string', 'min:3', 'max:500'],
        ]);

        $created = $this->attendance->manualEntry(
            $actor->id,
            (int) $validated['employee_id'],
            (string) $validated['log_date'],
            (string) $validated['check_in_time'],
            isset($validated['check_out_time']) ? (string) $validated['check_out_time'] : null,
            (string) $validated['reason'],
            $request->ip(),
        );

        return response()->json(['data' => $created], 201);
    }

    public function importCsv(Request $request): JsonResponse
    {
        $actor = $request->user();

        if (!$actor) {
            throw new AuthenticationException('Unauthenticated.');
        }

        if (!$request->hasFile('file')) {
            throw new HttpException(422, 'CSV file is required.');
        }

        $file = $request->file('file');

        if (!$file || !$file->isValid()) {
            throw new HttpException(422, 'Invalid file.');
        }

        $result = $this->attendance->importCsv(
            $actor->id,
            $file->getRealPath() ?: '',
            $request->ip(),
        );

        return response()->json(['data' => $result]);
    }
}
