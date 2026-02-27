<?php

declare(strict_types=1);

use App\Modules\Settings\Controllers\SecurityPoliciesController;
use App\Modules\Settings\Controllers\ApiIntegrationsController;
use App\Modules\Settings\Controllers\ShiftTemplatesController;
use App\Modules\Settings\Controllers\NotificationRulesController;
use App\Modules\Settings\Controllers\DataRetentionController;
use App\Modules\Settings\Controllers\HeadOfficeGeoFenceController;
use Illuminate\Support\Facades\Route;

Route::prefix('settings')->group(function (): void {
    Route::get('/security', [SecurityPoliciesController::class, 'show'])->middleware('permission:settings.manage');
    Route::put('/security', [SecurityPoliciesController::class, 'update'])->middleware('permission:settings.manage');

    Route::get('/head-office-geo', [HeadOfficeGeoFenceController::class, 'show'])->middleware('permission:settings.manage');
    Route::put('/head-office-geo', [HeadOfficeGeoFenceController::class, 'update'])->middleware('permission:settings.manage');

    Route::get('/api-keys', [ApiIntegrationsController::class, 'keysIndex'])->middleware('permission:settings.manage');
    Route::post('/api-keys', [ApiIntegrationsController::class, 'keysCreate'])->middleware('permission:settings.manage');
    Route::post('/api-keys/{apiKey}/regenerate', [ApiIntegrationsController::class, 'keysRegenerate'])->middleware('permission:settings.manage');
    Route::delete('/api-keys/{apiKey}', [ApiIntegrationsController::class, 'keysRevoke'])->middleware('permission:settings.manage');

    Route::get('/webhook', [ApiIntegrationsController::class, 'webhookShow'])->middleware('permission:settings.manage');
    Route::put('/webhook', [ApiIntegrationsController::class, 'webhookUpdate'])->middleware('permission:settings.manage');
    Route::post('/webhook/test', [ApiIntegrationsController::class, 'webhookTest'])->middleware('permission:settings.manage');

    Route::get('/shift-templates', [ShiftTemplatesController::class, 'index'])->middleware('permission:settings.manage');
    Route::post('/shift-templates', [ShiftTemplatesController::class, 'store'])->middleware('permission:settings.manage');
    Route::put('/shift-templates/{shiftTemplate}', [ShiftTemplatesController::class, 'update'])->middleware('permission:settings.manage');
    Route::delete('/shift-templates/{shiftTemplate}', [ShiftTemplatesController::class, 'destroy'])->middleware('permission:settings.manage');

    Route::get('/shift-defaults', [ShiftTemplatesController::class, 'defaultsShow'])->middleware('permission:settings.manage');
    Route::put('/shift-defaults', [ShiftTemplatesController::class, 'defaultsUpdate'])->middleware('permission:settings.manage');

    Route::get('/notification-rules', [NotificationRulesController::class, 'show'])->middleware('permission:settings.manage');
    Route::put('/notification-rules', [NotificationRulesController::class, 'update'])->middleware('permission:settings.manage');
    Route::post('/notification-rules/reset', [NotificationRulesController::class, 'reset'])->middleware('permission:settings.manage');

    Route::get('/data-retention', [DataRetentionController::class, 'show'])->middleware('permission:settings.manage');
    Route::put('/data-retention', [DataRetentionController::class, 'update'])->middleware('permission:settings.manage');
    Route::post('/data-retention/reset', [DataRetentionController::class, 'reset'])->middleware('permission:settings.manage');
});
