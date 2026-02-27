<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Artisan;

// TODO: REMOVE THESE ROUTES AFTER PRODUCTION DEPLOYMENT
Route::get('/deploy/migrate', function () {
    Artisan::call('migrate --force');
    return 'Database Migration Completed Successfully!';
});

Route::get('/deploy/optimize', function () {
    Artisan::call('optimize:clear');
    Artisan::call('config:cache');
    Artisan::call('route:cache');
    Artisan::call('view:cache');
    return 'Laravel Caching and Optimization Completed Successfully!';
});

Route::view('/welcome', 'welcome');

Route::view('/', 'app');
Route::view('/{any}', 'app')->where('any', '^(?!api).*$');
