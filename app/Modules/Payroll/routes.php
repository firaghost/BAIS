<?php

declare(strict_types=1);

use App\Modules\Payroll\Controllers\PayrollController;
use App\Modules\Payroll\Controllers\UserShiftScheduleController;
use Illuminate\Support\Facades\Route;

Route::prefix('payroll')->group(function (): void {
    Route::get('/records', [PayrollController::class, 'index'])->middleware('permission:payroll.view');
    Route::post('/generate', [PayrollController::class, 'generate'])->middleware('permission:payroll.generate');
    Route::get('/export', [PayrollController::class, 'exportCsv'])->middleware('permission:payroll.export');

    Route::get('/shift-schedules', [UserShiftScheduleController::class, 'index'])->middleware('permission:shift_schedules.view');
    Route::post('/shift-schedules', [UserShiftScheduleController::class, 'store'])->middleware('permission:shift_schedules.manage');
    Route::patch('/shift-schedules/{userShiftSchedule}', [UserShiftScheduleController::class, 'update'])->middleware('permission:shift_schedules.manage');
    Route::delete('/shift-schedules/{userShiftSchedule}', [UserShiftScheduleController::class, 'destroy'])->middleware('permission:shift_schedules.manage');
});
