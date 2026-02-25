<?php

declare(strict_types=1);

use App\Modules\Shifts\Controllers\ShiftController;
use Illuminate\Support\Facades\Route;

Route::prefix('shifts')->group(function (): void {
    Route::get('/', [ShiftController::class, 'index'])->middleware('permission:shifts.view');
    Route::post('/', [ShiftController::class, 'store'])->middleware('permission:shifts.manage');
    Route::put('/{shift}', [ShiftController::class, 'update'])->middleware('permission:shifts.manage');
    Route::delete('/{shift}', [ShiftController::class, 'destroy'])->middleware('permission:shifts.manage');
});
