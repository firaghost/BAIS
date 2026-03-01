<?php

declare(strict_types=1);

namespace App\Modules\Holidays\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Holidays\Models\Holiday;
use App\Modules\Holidays\Services\HolidayService;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class HolidayController extends Controller
{
    public function __construct(private readonly HolidayService $service)
    {
    }

    public function today(Request $request): JsonResponse
    {
        $actor = $request->user();
        if (!$actor) {
            throw new AuthenticationException('Unauthenticated.');
        }

        $countryCode = is_string($request->query('country_code')) ? strtoupper(trim((string) $request->query('country_code'))) : 'ET';
        $countryCode = $countryCode === '' ? 'ET' : $countryCode;

        $date = now()->toDateString();
        $holiday = $this->service->findActiveForDate($countryCode, $date);

        return response()->json([
            'data' => [
                'date' => $date,
                'country_code' => $countryCode,
                'is_holiday' => $holiday !== null,
                'holiday' => $holiday,
            ],
        ]);
    }

    public function upcoming(Request $request): JsonResponse
    {
        $actor = $request->user();
        if (!$actor) {
            throw new AuthenticationException('Unauthenticated.');
        }

        $countryCode = is_string($request->query('country_code')) ? strtoupper(trim((string) $request->query('country_code'))) : 'ET';
        $countryCode = $countryCode === '' ? 'ET' : $countryCode;

        $from = is_string($request->query('from')) ? (string) $request->query('from') : now()->toDateString();
        $to = is_string($request->query('to')) ? (string) $request->query('to') : now()->copy()->addDays(30)->toDateString();

        $items = $this->service->upcoming($countryCode, $from, $to);

        return response()->json([
            'data' => [
                'country_code' => $countryCode,
                'from' => $from,
                'to' => $to,
                'items' => $items,
            ],
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $actor = $request->user();
        if (!$actor) {
            throw new AuthenticationException('Unauthenticated.');
        }

        $perPage = (int) $request->query('per_page', 50);
        $perPage = max(1, min(200, $perPage));

        $from = is_string($request->query('from')) ? (string) $request->query('from') : null;
        $to = is_string($request->query('to')) ? (string) $request->query('to') : null;

        $result = $this->service->index($actor, $perPage, $from, $to);

        return response()->json(['data' => $result]);
    }

    public function upsert(Request $request): JsonResponse
    {
        $actor = $request->user();
        if (!$actor) {
            throw new AuthenticationException('Unauthenticated.');
        }

        $validated = $request->validate([
            'country_code' => ['nullable', 'string', 'size:2'],
            'holiday_date' => ['required', 'date_format:Y-m-d'],
            'name' => ['required', 'string', 'min:2', 'max:150'],
            'type' => ['nullable', 'string', 'max:30'],
            'is_active' => ['nullable', 'boolean'],
            'reason' => ['required', 'string', 'min:3', 'max:500'],
        ]);

        $saved = $this->service->upsert(
            $actor,
            $validated,
            (string) $validated['reason'],
            $request->ip(),
        );

        return response()->json(['data' => $saved]);
    }

    public function destroy(Request $request, Holiday $holiday): JsonResponse
    {
        $actor = $request->user();
        if (!$actor) {
            throw new AuthenticationException('Unauthenticated.');
        }

        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:3', 'max:500'],
        ]);

        $this->service->delete($actor, $holiday, (string) $validated['reason'], $request->ip());

        return response()->json(['status' => 'ok']);
    }

    public function importEthiopiaMajor(Request $request): JsonResponse
    {
        $actor = $request->user();
        if (!$actor) {
            throw new AuthenticationException('Unauthenticated.');
        }

        $validated = $request->validate([
            'year' => ['required', 'integer', 'min:2000', 'max:2100'],
            'reason' => ['required', 'string', 'min:3', 'max:500'],
        ]);

        $count = $this->service->importEthiopiaMajor(
            $actor,
            (int) $validated['year'],
            (string) $validated['reason'],
            $request->ip(),
        );

        return response()->json(['data' => ['imported' => $count]]);
    }

    public function importCsv(Request $request): JsonResponse
    {
        $actor = $request->user();
        if (!$actor) {
            throw new AuthenticationException('Unauthenticated.');
        }

        $validated = $request->validate([
            'file' => ['required', 'file'],
            'reason' => ['required', 'string', 'min:3', 'max:500'],
            'country_code' => ['nullable', 'string', 'size:2'],
        ]);

        $file = $request->file('file');
        if (!$file) {
            throw new HttpException(422, 'Missing file.');
        }

        $path = $file->getRealPath();
        if (!is_string($path) || $path === '') {
            throw new HttpException(422, 'Invalid file.');
        }

        $countryCode = is_string(($validated['country_code'] ?? null))
            ? strtoupper(trim((string) $validated['country_code']))
            : null;

        $result = $this->service->importFromCsv(
            $actor,
            $path,
            (string) $validated['reason'],
            $request->ip(),
            $countryCode,
        );

        return response()->json(['data' => $result]);
    }
}
