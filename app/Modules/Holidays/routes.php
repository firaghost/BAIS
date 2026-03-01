<?php

declare(strict_types=1);

use App\Modules\Holidays\Controllers\HolidayController;
use Illuminate\Support\Facades\Route;

Route::prefix('holidays')->group(function (): void {
    Route::get('/today', [HolidayController::class, 'today'])->middleware('permission:attendance.checkin');
    Route::get('/upcoming', [HolidayController::class, 'upcoming'])->middleware('permission:attendance.checkin');
});

Route::prefix('settings/holidays')->group(function (): void {
    Route::get('/', [HolidayController::class, 'index'])->middleware('permission:holidays.manage');
    Route::post('/', [HolidayController::class, 'upsert'])->middleware('permission:holidays.manage');
    Route::delete('/{holiday}', [HolidayController::class, 'destroy'])->middleware('permission:holidays.manage');
    Route::post('/import/ethiopia-major', [HolidayController::class, 'importEthiopiaMajor'])->middleware('permission:holidays.manage');
    Route::post('/import/csv', [HolidayController::class, 'importCsv'])->middleware('permission:holidays.manage');
});
