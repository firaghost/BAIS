<?php

declare(strict_types=1);

use App\Modules\Users\Controllers\UserRoleController;
use Illuminate\Support\Facades\Route;

Route::prefix('users')->group(function (): void {
    Route::post('/{user}/roles', [UserRoleController::class, 'assign'])->middleware('permission:users.roles.manage');
    Route::delete('/{user}/roles/{roleId}', [UserRoleController::class, 'remove'])->middleware('permission:users.roles.manage');
});
