<?php

declare(strict_types=1);

namespace App\Modules\Roles\Middleware;

use Closure;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    public function handle(Request $request, Closure $next, string $permissionSlug): Response
    {
        $user = $request->user();

        if (!$user) {
            throw new AuthenticationException('Unauthenticated.');
        }

        if (!method_exists($user, 'hasPermission') || !$user->hasPermission($permissionSlug)) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return new JsonResponse(
                    ['message' => 'Forbidden.', 'missing_permission' => $permissionSlug],
                    403,
                );
            }

            abort(403, 'Forbidden.');
        }

        return $next($request);
    }
}
