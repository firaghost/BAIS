<?php

declare(strict_types=1);

use App\Modules\Audit\Controllers\AuditLogController;
use Illuminate\Support\Facades\Route;

Route::prefix('audit')
    ->group(function (): void {
        Route::get('/logs', [AuditLogController::class, 'index'])->middleware('permission:audit.view');
    });
