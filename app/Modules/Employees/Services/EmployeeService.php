<?php

declare(strict_types=1);

namespace App\Modules\Employees\Services;

use App\Models\User;
use App\Modules\Audit\Services\AuditWriterService;
use App\Modules\Employees\Models\Employee;
use Illuminate\Database\DatabaseManager;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
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

    public function update(User $actor, Employee $employee, array $data, ?string $ipAddress): Employee
    {
        return $this->db->transaction(function () use ($actor, $employee, $data, $ipAddress): Employee {
            $old = $employee->toArray();

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
}
