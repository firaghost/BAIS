<?php

declare(strict_types=1);

use App\Modules\SystemUsers\Controllers\SystemUsersController;
use Illuminate\Support\Facades\Route;

Route::prefix('system-users')->group(function (): void {
    Route::get('/', [SystemUsersController::class, 'index'])->middleware('permission:users.manage');
    Route::get('/roles', [SystemUsersController::class, 'rolesIndex'])->middleware('permission:users.manage');
    Route::post('/', [SystemUsersController::class, 'store'])->middleware('permission:users.manage');

    Route::put('/{user}', [SystemUsersController::class, 'update'])->middleware('permission:users.manage');
    Route::post('/{user}/deactivate', [SystemUsersController::class, 'deactivate'])->middleware('permission:users.manage');
    Route::post('/{user}/activate', [SystemUsersController::class, 'activate'])->middleware('permission:users.manage');
});
