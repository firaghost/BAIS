<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::view('/app', 'app');
Route::view('/app/{any}', 'app')->where('any', '.*');
