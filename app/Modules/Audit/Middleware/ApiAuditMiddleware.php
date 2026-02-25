<?php

declare(strict_types=1);

namespace App\Modules\Audit\Middleware;

use App\Modules\Audit\Services\AuditWriterService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ApiAuditMiddleware
{
    public function __construct(private readonly AuditWriterService $auditWriter)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        try {
            $this->logIfNeeded($request, $response);
        } catch (\Throwable) {
            // Never block requests or crash the server because of audit logging.
        }

        return $response;
    }

    private function logIfNeeded(Request $request, Response $response): void
    {
        if (!$request->is('api/*')) {
            return;
        }

        if (!$this->isStateChangingMethod($request->method())) {
            return;
        }

        if ($request->is('api/auth/login')) {
            return;
        }

        $actor = $request->user();

        if (!$actor) {
            return;
        }

        $action = $this->buildAction($request);

        $this->auditWriter->log(
            $actor->id,
            $action,
            'http',
            null,
            null,
            [
                'method' => $request->method(),
                'path' => '/'.$request->path(),
                'status' => $response->getStatusCode(),
                'payload' => $this->safePayload($request),
            ],
            $request->ip(),
        );
    }

    private function isStateChangingMethod(string $method): bool
    {
        $method = strtoupper($method);

        return in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true);
    }

    private function buildAction(Request $request): string
    {
        $base = 'http.'.strtolower($request->method()).':'.$request->path();

        if (strlen($base) <= 100) {
            return $base;
        }

        return substr($base, 0, 100);
    }

    private function safePayload(Request $request): array
    {
        $payload = $request->except([
            'password',
            'password_confirmation',
            'token',
            'access_token',
            'refresh_token',
        ]);

        $maxBytes = 8 * 1024;
        $encoded = json_encode($payload);

        if (!is_string($encoded) || strlen($encoded) <= $maxBytes) {
            return is_array($payload) ? $payload : [];
        }

        return [
            'truncated' => true,
            'keys' => array_keys($payload),
        ];
    }
}
