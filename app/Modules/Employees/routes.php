<?php

declare(strict_types=1);

use App\Modules\Employees\Controllers\EmployeeController;
use Illuminate\Support\Facades\Route;

Route::prefix('employees')->group(function (): void {
    Route::get('/', [EmployeeController::class, 'index'])->middleware('permission:employees.view');
    Route::get('/departments', [EmployeeController::class, 'departments'])->middleware('permission:employees.view');
    Route::get('/bulk-template', [EmployeeController::class, 'bulkTemplate'])->middleware('permission:employees.manage');
    Route::get('/{employee}', [EmployeeController::class, 'show'])->middleware('permission:employees.view');
    Route::post('/', [EmployeeController::class, 'store'])->middleware('permission:employees.manage');
    Route::post('/bulk-upload', [EmployeeController::class, 'bulkUpload'])->middleware('permission:employees.manage');
    Route::put('/{employee}', [EmployeeController::class, 'update'])->middleware('permission:employees.manage');
    Route::delete('/{employee}', [EmployeeController::class, 'destroy'])->middleware('permission:employees.manage');
    Route::post('/{employee}/photo', [EmployeeController::class, 'uploadPhoto'])->middleware('permission:employees.manage');
    Route::post('/{employee}/provision-user', [EmployeeController::class, 'provisionUser'])->middleware('permission:employees.manage');
});
