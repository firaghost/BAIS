<?php

use Illuminate\Support\Facades\Route;

Route::view('/welcome', 'welcome');

Route::view('/', 'app');
Route::view('/{any}', 'app')->where('any', '^(?!api).*$');
