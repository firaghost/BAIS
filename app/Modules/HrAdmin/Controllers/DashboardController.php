<?php

declare(strict_types=1);

namespace App\Modules\HrAdmin\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\HrAdmin\Services\HrAdminDashboardService;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(private readonly HrAdminDashboardService $dashboard)
    {
    }

    public function overview(Request $request): JsonResponse
    {
        $actor = $request->user();

        if (!$actor) {
            throw new AuthenticationException('Unauthenticated.');
        }

        $branchId = $request->query('branch_id');
        $branchId = is_numeric($branchId) ? (int) $branchId : null;
        $branchId = $branchId && $branchId > 0 ? $branchId : null;

        $month = $request->query('month');
        $month = is_string($month) ? trim($month) : null;

        return response()->json($this->dashboard->getOverview($actor->id, $branchId, $month));
    }

    public function navMeta(Request $request): JsonResponse
    {
        $actor = $request->user();

        if (!$actor) {
            throw new AuthenticationException('Unauthenticated.');
        }

        return response()->json($this->dashboard->getNavMeta());
    }

    public function sendWarning(Request $request): JsonResponse
    {
        $actor = $request->user();

        if (!$actor) {
            throw new AuthenticationException('Unauthenticated.');
        }

        $validated = $request->validate([
            'employee_id' => ['required', 'integer', 'min:1'],
        ]);

        $this->dashboard->sendWarning($actor->id, (int) $validated['employee_id'], $request->ip());

        return response()->json(['ok' => true]);
    }
}
