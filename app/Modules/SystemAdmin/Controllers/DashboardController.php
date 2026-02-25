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

        if (!in_array($days, [7, 30], true)) {
            $days = 7;
        }

        return response()->json($this->overviewService->getOverview($days));
    }
}
