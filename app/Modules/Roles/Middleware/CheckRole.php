<?php

declare(strict_types=1);

namespace App\Modules\Roles\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    public function handle(Request $request, Closure $next, string $roleSlug): Response
    {
        $user = $request->user();

        if (!$user || !method_exists($user, 'hasRole') || !$user->hasRole($roleSlug)) {
            if ($request->expectsJson()) {
                return new JsonResponse(
                    ['message' => 'Forbidden.', 'missing_role' => $roleSlug],
                    403,
                );
            }

            abort(403, 'Forbidden.');
        }

        return $next($request);
    }
}
