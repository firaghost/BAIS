<?php

declare(strict_types=1);

namespace App\Modules\SystemAdmin\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\SystemAdmin\Services\DashboardOverviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(private readonly DashboardOverviewService $overviewService)
    {
    }

    public function overview(Request $request): JsonResponse
    {
        $days = (int) $request->query('days', 7);

        $branchId = $request->query('branch_id');
        $branchId = is_numeric($branchId) ? (int) $branchId : null;
        $branchId = $branchId && $branchId > 0 ? $branchId : null;

        $page = (int) $request->query('page', 1);
        $perPage = (int) $request->query('per_page', 5);

        if (!in_array($days, [7, 30], true)) {
            $days = 7;
        }

        return response()->json($this->overviewService->getOverview($days, $branchId, $page, $perPage));
    }
}
