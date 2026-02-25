<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

@ini_set('pcre.jit', '0');
@ini_set('log_errors', '1');
@ini_set('error_log', __DIR__.'/../storage/logs/php-error.log');

register_shutdown_function(static function (): void {
    $error = error_get_last();

    if (!$error) {
        return;
    }

    if (!in_array($error['type'] ?? 0, [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        return;
    }

    $path = __DIR__.'/../storage/logs/php-fatal.log';
    $payload = [
        'time' => date('c'),
        'uri' => $_SERVER['REQUEST_URI'] ?? null,
        'type' => $error['type'] ?? null,
        'message' => $error['message'] ?? null,
        'file' => $error['file'] ?? null,
        'line' => $error['line'] ?? null,
    ];

    @file_put_contents($path, json_encode($payload).PHP_EOL, FILE_APPEND);
});

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require __DIR__.'/../vendor/autoload.php';

// Bootstrap Laravel and handle the request...
/** @var Application $app */
$app = require_once __DIR__.'/../bootstrap/app.php';

$app->handleRequest(Request::capture());
