<?php

declare(strict_types=1);

use App\Modules\Departments\Controllers\DepartmentController;
use Illuminate\Support\Facades\Route;

Route::prefix('departments')->group(function (): void {
    Route::get('/', [DepartmentController::class, 'index'])->middleware('permission:departments.manage');
    Route::post('/', [DepartmentController::class, 'store'])->middleware('permission:departments.manage');
    Route::put('/{department}', [DepartmentController::class, 'update'])->middleware('permission:departments.manage');
    Route::delete('/{department}', [DepartmentController::class, 'destroy'])->middleware('permission:departments.manage');
});
