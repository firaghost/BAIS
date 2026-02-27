<?php

declare(strict_types=1);

namespace App\Modules\Employees\Services;

use App\Models\User;
use App\Modules\Audit\Services\AuditWriterService;
use App\Modules\Branches\Models\Branch;
use App\Modules\Employees\Models\Employee;
use Illuminate\Database\DatabaseManager;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Throwable;
use Symfony\Component\HttpKernel\Exception\HttpException;

class EmployeeService
{
    public function __construct(
        private readonly DatabaseManager $db,
        private readonly AuditWriterService $auditWriter,
    ) {
    }

    public function create(User $actor, array $data, ?string $ipAddress): Employee
    {
        return $this->db->transaction(function () use ($actor, $data, $ipAddress): Employee {
            $data = $this->normalizeBranchInput($data);

            $hireDate = (string) $data['hire_date'];
            $joinYear = (int) substr($hireDate, 0, 4);

            if ($joinYear < 2000 || $joinYear > 2100) {
                throw new HttpException(422, 'Invalid hire_date year.');
            }

            $nextSequence = (int) Employee::query()
                ->where('join_year', $joinYear)
                ->lockForUpdate()
                ->max('sequence');

            $sequence = $nextSequence + 1;
            $employeeCode = $this->formatEmployeeCode($sequence, $joinYear);

            $employee = Employee::query()->create([
                'employee_code' => $employeeCode,
                'join_year' => $joinYear,
                'sequence' => $sequence,
                'user_id' => $data['user_id'] ?? null,
                'branch_id' => $data['branch_id'] ?? null,
                'first_name' => (string) $data['first_name'],
                'middle_name' => $data['middle_name'] ?? null,
                'last_name' => (string) $data['last_name'],
                'phone' => $data['phone'] ?? null,
                'email' => $data['email'] ?? null,
                'job_title' => $data['job_title'] ?? null,
                'department' => $data['department'] ?? null,
                'hire_date' => $hireDate,
                'status' => $data['status'] ?? 'active',
            ]);

            $this->auditWriter->log(
                $actor->id,
                'employee.created',
                Employee::class,
                $employee->id,
                null,
                $employee->toArray(),
                $ipAddress,
            );

            return $employee;
        });
    }

    public function bulkUploadCsv(User $actor, UploadedFile $file, ?string $ipAddress): array
    {
        $handle = fopen($file->getRealPath(), 'rb');

        if (!is_resource($handle)) {
            throw new HttpException(400, 'Invalid upload.');
        }

        $header = fgetcsv($handle);
        if (!is_array($header) || $header === []) {
            fclose($handle);
            throw new HttpException(422, 'CSV header row is required.');
        }

        $header = array_map(static fn ($h) => strtolower(trim((string) $h)), $header);
        $indexes = array_flip($header);

        $required = ['first_name', 'last_name', 'hire_date'];
        foreach ($required as $col) {
            if (!array_key_exists($col, $indexes)) {
                fclose($handle);
                throw new HttpException(422, "Missing required column: {$col}");
            }
        }

        $created = 0;
        $failed = 0;
        $errors = [];
        $rowNumber = 1;

        while (($row = fgetcsv($handle)) !== false) {
            $rowNumber++;

            if (!is_array($row) || $row === []) {
                continue;
            }

            $value = static function (string $col) use ($indexes, $row) {
                $i = $indexes[$col] ?? null;
                if ($i === null) {
                    return null;
                }
                $v = $row[$i] ?? null;
                $v = is_string($v) ? trim($v) : $v;
                return $v === '' ? null : $v;
            };

            $hireDate = (string) ($value('hire_date') ?? '');
            $hireDate = strlen($hireDate) >= 10 ? substr($hireDate, 0, 10) : $hireDate;

            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $hireDate)) {
                $failed++;
                $errors[] = [
                    'row' => $rowNumber,
                    'message' => 'Invalid hire_date. Expected YYYY-MM-DD.',
                ];
                continue;
            }

            $branchId = null;
            $branchIdRaw = $value('branch_id');
            if (is_string($branchIdRaw) && preg_match('/^\d+$/', $branchIdRaw)) {
                $branchId = (int) $branchIdRaw;
            }

            $branchCode = $value('branch_code');
            $branchName = $value('branch_name');

            $status = (string) ($value('status') ?? 'active');
            if (!in_array($status, ['active', 'inactive'], true)) {
                $status = 'active';
            }

            $payload = [
                'branch_id' => $branchId,
                'branch_code' => $branchCode,
                'branch_name' => $branchName,
                'first_name' => (string) ($value('first_name') ?? ''),
                'middle_name' => $value('middle_name'),
                'last_name' => (string) ($value('last_name') ?? ''),
                'phone' => $value('phone'),
                'email' => $value('email'),
                'job_title' => $value('job_title'),
                'department' => $value('department'),
                'hire_date' => $hireDate,
                'status' => $status,
            ];

            if (trim($payload['first_name']) === '' || trim($payload['last_name']) === '') {
                $failed++;
                $errors[] = [
                    'row' => $rowNumber,
                    'message' => 'first_name and last_name are required.',
                ];
                continue;
            }

            try {
                $this->create($actor, $payload, $ipAddress);
                $created++;
            } catch (Throwable $e) {
                $failed++;
                $errors[] = [
                    'row' => $rowNumber,
                    'message' => $e->getMessage() !== '' ? $e->getMessage() : 'Failed to create employee.',
                ];
            }
        }

        fclose($handle);

        return [
            'created' => $created,
            'failed' => $failed,
            'errors' => $errors,
        ];
    }

    public function delete(User $actor, Employee $employee, ?string $ipAddress): void
    {
        $this->db->transaction(function () use ($actor, $employee, $ipAddress): void {
            $old = $employee->toArray();
            $id = (int) $employee->id;

            $employee->delete();

            $this->auditWriter->log(
                $actor->id,
                'employee.deleted',
                Employee::class,
                $id,
                $old,
                null,
                $ipAddress,
            );
        });
    }

    public function update(User $actor, Employee $employee, array $data, ?string $ipAddress): Employee
    {
        return $this->db->transaction(function () use ($actor, $employee, $data, $ipAddress): Employee {
            $old = $employee->toArray();

            $data = $this->normalizeBranchInput($data);

            $employee->fill($data);
            $employee->save();

            $this->auditWriter->log(
                $actor->id,
                'employee.updated',
                Employee::class,
                $employee->id,
                $old,
                $employee->toArray(),
                $ipAddress,
            );

            return $employee;
        });
    }

    public function uploadPhoto(User $actor, Employee $employee, UploadedFile $photo, ?string $ipAddress): Employee
    {
        return $this->db->transaction(function () use ($actor, $employee, $photo, $ipAddress): Employee {
            $old = $employee->toArray();

            $ext = strtolower($photo->getClientOriginalExtension() ?: 'jpg');
            $filename = $employee->employee_code.'.'.$ext;
            $path = $photo->storeAs('employees', $filename, 'public');

            if (!is_string($path) || $path === '') {
                throw new HttpException(500, 'Failed to store photo.');
            }

            $employee->photo_path = $path;
            $employee->save();

            $this->auditWriter->log(
                $actor->id,
                'employee.photo_uploaded',
                Employee::class,
                $employee->id,
                $old,
                $employee->toArray(),
                $ipAddress,
            );

            return $employee;
        });
    }

    private function formatEmployeeCode(int $sequence, int $year): string
    {
        return 'SDB-'.str_pad((string) $sequence, 3, '0', STR_PAD_LEFT).'-'.$year;
    }

    private function normalizeBranchInput(array $data): array
    {
        $hasBranchId = array_key_exists('branch_id', $data) && $data['branch_id'] !== null;

        if (!$hasBranchId && array_key_exists('branch_code', $data) && is_string($data['branch_code']) && trim($data['branch_code']) !== '') {
            $code = trim($data['branch_code']);
            $id = Branch::query()->where('branch_code', $code)->value('id');
            if (!$id) {
                throw new HttpException(422, 'Invalid branch_code.');
            }
            $data['branch_id'] = (int) $id;
        }

        if (!$hasBranchId && array_key_exists('branch_name', $data) && is_string($data['branch_name']) && trim($data['branch_name']) !== '') {
            $name = trim($data['branch_name']);
            $id = Branch::query()->where('name', $name)->value('id');
            if (!$id) {
                throw new HttpException(422, 'Invalid branch_name.');
            }
            $data['branch_id'] = (int) $id;
        }

        unset($data['branch_code'], $data['branch_name']);

        return $data;
    }
}
