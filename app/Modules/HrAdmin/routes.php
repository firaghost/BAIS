<?php

declare(strict_types=1);

use App\Modules\HrAdmin\Controllers\AttendanceController;
use App\Modules\HrAdmin\Controllers\DashboardController;
use Illuminate\Support\Facades\Route;

Route::prefix('hr-admin')
    ->middleware('role:hr-admin')
    ->group(function (): void {
        Route::get('/dashboard/overview', [DashboardController::class, 'overview']);
        Route::get('/dashboard/nav-meta', [DashboardController::class, 'navMeta']);
        Route::post('/warnings', [DashboardController::class, 'sendWarning']);

        Route::get('/attendance/logs', [AttendanceController::class, 'index']);
        Route::get('/attendance/departments', [AttendanceController::class, 'departments']);
        Route::get('/employees/lookup', [AttendanceController::class, 'employeeLookup']);
        Route::post('/attendance/logs', [AttendanceController::class, 'store']);
        Route::post('/attendance/import', [AttendanceController::class, 'importCsv']);
    });
