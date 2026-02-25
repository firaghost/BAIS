<?php

declare(strict_types=1);

namespace App\Modules\Audit\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Audit\Requests\AuditLogIndexRequest;
use App\Modules\Audit\Services\AuditLogService;
use Illuminate\Http\JsonResponse;

class AuditLogController extends Controller
{
    public function __construct(private readonly AuditLogService $auditLogService)
    {
    }

    public function index(AuditLogIndexRequest $request): JsonResponse
    {
        $this->authorize('viewAny', \App\Modules\Audit\Models\AuditLog::class);

        $result = $this->auditLogService->paginate($request->filters(), $request->perPage());

        return response()->json($result);
    }
}
