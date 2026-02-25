<?php

declare(strict_types=1);

use App\Modules\Branches\Controllers\BranchController;
use Illuminate\Support\Facades\Route;

Route::prefix('branches')->group(function (): void {
    Route::get('/', [BranchController::class, 'index'])->middleware('permission:branches.view');
    Route::post('/', [BranchController::class, 'store'])->middleware('permission:branches.manage');
    Route::put('/{branch}', [BranchController::class, 'update'])->middleware('permission:branches.manage');
    Route::delete('/{branch}', [BranchController::class, 'destroy'])->middleware('permission:branches.manage');
});
