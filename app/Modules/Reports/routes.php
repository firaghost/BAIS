<?php

declare(strict_types=1);

use App\Modules\Reports\Controllers\ReportsController;
use Illuminate\Support\Facades\Route;

Route::prefix('reports')->group(function (): void {
    Route::get('/overview', [ReportsController::class, 'overview'])->middleware('permission:reports.view');
    Route::get('/templates', [ReportsController::class, 'templates'])->middleware('permission:reports.view');
    Route::get('/metrics', [ReportsController::class, 'metrics'])->middleware('permission:reports.view');
    Route::get('/history', [ReportsController::class, 'history'])->middleware('permission:reports.view');

    Route::post('/run', [ReportsController::class, 'run'])->middleware('permission:reports.run');
    Route::get('/runs/{reportRun}/download', [ReportsController::class, 'download'])->middleware('permission:reports.export');
    Route::delete('/runs/{reportRun}', [ReportsController::class, 'destroy'])->whereNumber('reportRun')->middleware('permission:reports.delete');
});
