<?php

declare(strict_types=1);

use App\Modules\SystemAdmin\Controllers\DashboardController;
use Illuminate\Support\Facades\Route;

Route::prefix('system-admin')
    ->middleware('role:super-admin')
    ->group(function (): void {
        Route::get('/dashboard/overview', [DashboardController::class, 'overview']);
    });
