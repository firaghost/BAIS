<?php

declare(strict_types=1);

use App\Modules\Leaves\Controllers\LeaveRequestController;
use App\Modules\Leaves\Controllers\LeaveCreditController;
use Illuminate\Support\Facades\Route;

Route::prefix('leaves')->group(function (): void {
    Route::get('/requests', [LeaveRequestController::class, 'index']);
    Route::post('/requests', [LeaveRequestController::class, 'store'])->middleware('permission:leaves.request');
    Route::post('/requests/{leaveRequest}/approve', [LeaveRequestController::class, 'approve']);
    Route::post('/requests/{leaveRequest}/reject', [LeaveRequestController::class, 'reject']);
    Route::get('/balance', [LeaveRequestController::class, 'balance']);

    Route::post('/credits/bulk-set', [LeaveCreditController::class, 'bulkSet']);
    Route::get('/credits/employee/{employeeId}', [LeaveCreditController::class, 'employeeCredits']);
});
