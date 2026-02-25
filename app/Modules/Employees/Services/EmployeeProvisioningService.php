<?php

declare(strict_types=1);

namespace App\Modules\Employees\Services;

use App\Models\User;
use App\Modules\Audit\Services\AuditWriterService;
use App\Modules\Employees\Models\Employee;
use Illuminate\Database\DatabaseManager;

class EmployeeProvisioningService
{
    public const DEFAULT_PASSWORD = 'Sidama@2050';

    public function __construct(
        private readonly DatabaseManager $db,
        private readonly AuditWriterService $auditWriter,
    ) {
    }

    public function provisionUser(User $actor, Employee $employee, string $email, ?string $name, ?string $ipAddress): User
    {
        return $this->db->transaction(function () use ($actor, $employee, $email, $name, $ipAddress): User {
            $employee->refresh();

            if ($employee->user_id) {
                return User::query()->findOrFail($employee->user_id);
            }

            $user = User::query()->create([
                'name' => $name ?? trim($employee->first_name.' '.$employee->last_name),
                'email' => $email,
                'password' => self::DEFAULT_PASSWORD,
                'must_change_password' => true,
            ]);

            $employee->user_id = $user->id;
            $employee->email = $employee->email ?? $email;
            $employee->save();

            $this->auditWriter->log(
                $actor->id,
                'employee.user_provisioned',
                Employee::class,
                $employee->id,
                null,
                ['user_id' => $user->id, 'email' => $email],
                $ipAddress,
            );

            return $user;
        });
    }
}
