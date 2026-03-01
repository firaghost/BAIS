<?php

declare(strict_types=1);

namespace App\Modules\Holidays\Services;

use App\Models\User;
use App\Modules\Audit\Services\AuditWriterService;
use App\Modules\Holidays\Models\Holiday;
use Illuminate\Database\DatabaseManager;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpKernel\Exception\HttpException;

class HolidayService
{
    public function __construct(
        private readonly DatabaseManager $db,
        private readonly AuditWriterService $auditWriter,
    ) {
    }

    public function index(User $actor, int $perPage, ?string $from, ?string $to): LengthAwarePaginator
    {
        $query = Holiday::query()->orderBy('holiday_date');

        if ($from) {
            $query->whereDate('holiday_date', '>=', $from);
        }

        if ($to) {
            $query->whereDate('holiday_date', '<=', $to);
        }

        return $query->paginate($perPage);
    }

    public function upsert(User $actor, array $data, string $reason, ?string $ipAddress): Holiday
    {
        return $this->db->transaction(function () use ($actor, $data, $reason, $ipAddress): Holiday {
            $date = Carbon::parse((string) $data['holiday_date'])->toDateString();

            $holiday = Holiday::query()->updateOrCreate(
                ['country_code' => (string) ($data['country_code'] ?? 'ET'), 'holiday_date' => $date],
                [
                    'name' => (string) $data['name'],
                    'type' => (string) ($data['type'] ?? 'public'),
                    'is_active' => array_key_exists('is_active', $data) ? (bool) $data['is_active'] : true,
                    'source' => (string) ($data['source'] ?? 'manual'),
                    'created_by' => $actor->id,
                ],
            );

            $payload = $holiday->toArray();
            $payload['reason'] = $reason;

            $this->auditWriter->log(
                $actor->id,
                'holidays.upsert',
                Holiday::class,
                $holiday->id,
                null,
                $payload,
                $ipAddress,
            );

            return $holiday;
        });
    }

    public function delete(User $actor, Holiday $holiday, string $reason, ?string $ipAddress): void
    {
        $this->db->transaction(function () use ($actor, $holiday, $reason, $ipAddress): void {
            $old = $holiday->toArray();
            $old['reason'] = $reason;

            $holiday->delete();

            $this->auditWriter->log(
                $actor->id,
                'holidays.deleted',
                Holiday::class,
                $holiday->id,
                $old,
                null,
                $ipAddress,
            );
        });
    }

    public function findActiveForDate(string $countryCode, string $date): ?Holiday
    {
        return Holiday::query()
            ->where('country_code', $countryCode)
            ->whereDate('holiday_date', $date)
            ->where('is_active', true)
            ->first();
    }

    public function upcoming(string $countryCode, string $from, string $to): array
    {
        return Holiday::query()
            ->where('country_code', $countryCode)
            ->where('is_active', true)
            ->whereBetween('holiday_date', [$from, $to])
            ->orderBy('holiday_date')
            ->get()
            ->values()
            ->all();
    }

    public function importEthiopiaMajor(User $actor, int $year, string $reason, ?string $ipAddress): int
    {
        if ($year < 2000 || $year > 2100) {
            throw new HttpException(422, 'Invalid year.');
        }

        $items = $this->ethiopiaMajorHolidaysForYear($year);
        $count = 0;

        foreach ($items as $item) {
            $this->upsert(
                $actor,
                [
                    'country_code' => 'ET',
                    'holiday_date' => $item['date'],
                    'name' => $item['name'],
                    'type' => 'public',
                    'is_active' => true,
                    'source' => 'import',
                ],
                $reason,
                $ipAddress,
            );
            $count++;
        }

        return $count;
    }

    public function importFromCsv(
        User $actor,
        string $csvPath,
        string $reason,
        ?string $ipAddress,
        ?string $countryCodeOverride,
    ): array {
        $handle = fopen($csvPath, 'rb');
        if ($handle === false) {
            throw new HttpException(422, 'Unable to read file.');
        }

        try {
            $header = fgetcsv($handle);
            if (!is_array($header) || $header === []) {
                throw new HttpException(422, 'CSV header row is missing.');
            }

            $header = array_map(static fn ($v): string => strtolower(trim((string) $v)), $header);
            $index = array_flip($header);

            $required = ['holiday_date', 'name'];
            foreach ($required as $col) {
                if (!array_key_exists($col, $index)) {
                    throw new HttpException(422, "CSV missing required column: {$col}");
                }
            }

            $imported = 0;
            $errors = [];
            $rowNumber = 1;

            while (($row = fgetcsv($handle)) !== false) {
                $rowNumber++;

                if (!is_array($row) || $row === []) {
                    continue;
                }

                $get = static function (string $col) use ($index, $row): ?string {
                    $i = $index[$col] ?? null;
                    if ($i === null) return null;
                    $v = $row[$i] ?? null;
                    if ($v === null) return null;
                    $s = trim((string) $v);
                    return $s === '' ? null : $s;
                };

                $date = $get('holiday_date');
                $name = $get('name');
                $type = $get('type') ?? 'public';
                $isActiveRaw = $get('is_active');

                if ($date === null || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                    $errors[] = ['row' => $rowNumber, 'message' => 'Invalid holiday_date (expected YYYY-MM-DD).'];
                    continue;
                }

                if ($name === null || mb_strlen($name) < 2) {
                    $errors[] = ['row' => $rowNumber, 'message' => 'Name is required.'];
                    continue;
                }

                $countryCode = $countryCodeOverride ? strtoupper(trim($countryCodeOverride)) : 'ET';
                if ($countryCode === '') {
                    $countryCode = 'ET';
                }

                $isActive = true;
                if ($isActiveRaw !== null) {
                    $normalized = strtolower($isActiveRaw);
                    $isActive = in_array($normalized, ['1', 'true', 'yes', 'y'], true);
                }

                try {
                    $this->upsert(
                        $actor,
                        [
                            'country_code' => $countryCode,
                            'holiday_date' => $date,
                            'name' => $name,
                            'type' => $type,
                            'is_active' => $isActive,
                            'source' => 'csv',
                        ],
                        $reason,
                        $ipAddress,
                    );
                    $imported++;
                } catch (\Throwable $e) {
                    $errors[] = ['row' => $rowNumber, 'message' => 'Failed to import row.'];
                }
            }

            return [
                'imported' => $imported,
                'errors' => $errors,
            ];
        } finally {
            fclose($handle);
        }
    }

    private function ethiopiaMajorHolidaysForYear(int $year): array
    {
        return [
            ['date' => sprintf('%d-01-01', $year), 'name' => 'New Year (Gregorian)'],
            ['date' => sprintf('%d-01-07', $year), 'name' => 'Ethiopian Christmas (Genna)'],
            ['date' => sprintf('%d-01-19', $year), 'name' => 'Epiphany (Timket)'],
            ['date' => sprintf('%d-03-02', $year), 'name' => 'Adwa Victory Day'],
            ['date' => sprintf('%d-05-01', $year), 'name' => 'International Workers\' Day'],
            ['date' => sprintf('%d-05-05', $year), 'name' => 'Patriots\' Victory Day'],
            ['date' => sprintf('%d-05-28', $year), 'name' => 'Downfall of the Derg Regime Day'],
            ['date' => sprintf('%d-09-11', $year), 'name' => 'Ethiopian New Year (Enkutatash)'],
            ['date' => sprintf('%d-09-27', $year), 'name' => 'Meskel'],
            ['date' => sprintf('%d-12-25', $year), 'name' => 'Christmas (Gregorian)'],
        ];
    }
}
