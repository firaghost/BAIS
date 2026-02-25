<?php

declare(strict_types=1);

use App\Modules\Attendance\Controllers\AttendanceController;
use App\Modules\Attendance\Controllers\AttendanceCorrectionRequestController;
use Illuminate\Support\Facades\Route;

Route::prefix('attendance')->group(function (): void {
    Route::post('/check-in', [AttendanceController::class, 'checkIn'])->middleware('permission:attendance.checkin');
    Route::post('/check-out', [AttendanceController::class, 'checkOut'])->middleware('permission:attendance.checkout');
    Route::get('/history', [AttendanceController::class, 'history'])->middleware('permission:attendance.history');

    Route::get('/manage', [AttendanceController::class, 'manageIndex'])->middleware('permission:attendance.manage.view');
    Route::patch('/logs/{attendanceLog}', [AttendanceController::class, 'manageUpdate'])->middleware('permission:attendance.manage.update');

    Route::get('/corrections', [AttendanceCorrectionRequestController::class, 'index'])->middleware('permission:attendance.corrections.view');
    Route::post('/corrections', [AttendanceCorrectionRequestController::class, 'store'])->middleware('permission:attendance.corrections.request');
    Route::post('/corrections/{attendanceCorrectionRequest}/approve', [AttendanceCorrectionRequestController::class, 'approve'])->middleware('permission:attendance.corrections.review');
    Route::post('/corrections/{attendanceCorrectionRequest}/reject', [AttendanceCorrectionRequestController::class, 'reject'])->middleware('permission:attendance.corrections.review');
});
