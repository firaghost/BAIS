<?php

declare(strict_types=1);

use App\Modules\Leaves\Controllers\LeaveRequestController;
use Illuminate\Support\Facades\Route;

Route::prefix('leaves')->group(function (): void {
    Route::get('/requests', [LeaveRequestController::class, 'index'])->middleware('permission:leaves.view');
    Route::post('/requests', [LeaveRequestController::class, 'store'])->middleware('permission:leaves.request');
    Route::post('/requests/{leaveRequest}/approve', [LeaveRequestController::class, 'approve'])->middleware('permission:leaves.approve');
    Route::post('/requests/{leaveRequest}/reject', [LeaveRequestController::class, 'reject'])->middleware('permission:leaves.approve');
    Route::get('/balance', [LeaveRequestController::class, 'balance']);
});
