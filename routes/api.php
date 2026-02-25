<?php

declare(strict_types=1);

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Route;

Route::get('/health', static fn () => response()->json(['status' => 'ok']));

foreach (File::glob(app_path('Modules/*/public_routes.php')) as $moduleRouteFile) {
    require $moduleRouteFile;
}

Route::middleware('auth:sanctum')->group(function (): void {
    $moduleRoutes = File::glob(app_path('Modules/*/routes.php'));

    foreach ($moduleRoutes as $moduleRouteFile) {
        require $moduleRouteFile;
    }
});
