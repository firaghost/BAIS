<?php

declare(strict_types=1);

namespace App\Modules\Reports\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Reports\Models\ReportRun;
use App\Modules\Reports\Requests\ReportRunRequest;
use App\Modules\Reports\Requests\ReportsHistoryRequest;
use App\Modules\Reports\Services\ReportsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportsController extends Controller
{
    public function __construct(private readonly ReportsService $service)
    {
    }

    public function overview(Request $request): JsonResponse
    {
        $this->authorize('view', ReportRun::class);

        return response()->json([
            'data' => $this->service->overview(),
        ]);
    }

    public function templates(Request $request): JsonResponse
    {
        $this->authorize('view', ReportRun::class);

        return response()->json([
            'data' => $this->service->templates(),
        ]);
    }

    public function metrics(Request $request): JsonResponse
    {
        $this->authorize('view', ReportRun::class);

        return response()->json([
            'data' => $this->service->availableMetrics(),
        ]);
    }

    public function history(ReportsHistoryRequest $request): JsonResponse
    {
        $this->authorize('view', ReportRun::class);

        $paginator = $this->service->history($request->page(), $request->perPage());

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'from' => $paginator->firstItem() ?? 0,
                'to' => $paginator->lastItem() ?? 0,
            ],
        ]);
    }

    public function run(ReportRunRequest $request): JsonResponse
    {
        $this->authorize('run', ReportRun::class);

        $created = $this->service->run($request->user(), $request->payload(), $request->ip());

        return response()->json(['data' => $created], 201);
    }

    public function download(Request $request, ReportRun $reportRun): StreamedResponse
    {
        $this->authorize('export', ReportRun::class);

        $format = is_string($request->query('format')) ? strtolower(trim((string) $request->query('format'))) : 'json';

        if (!in_array($format, ['json', 'csv', 'xlsx'], true)) {
            $format = 'json';
        }

        return $this->service->download($reportRun, $format);
    }

    public function destroy(Request $request, int $reportRun): JsonResponse
    {
        $this->authorize('delete', ReportRun::class);

        $this->service->deleteRunById($request->user(), $reportRun, $request->ip());

        return response()->json(['ok' => true]);
    }
}
