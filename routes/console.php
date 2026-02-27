<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('leaves:reset-credits {--year=}', function () {
    $year = (int) ($this->option('year') ?: now()->year);

    $defaults = [
        'annual' => 21,
        'sick' => 10,
        'personal' => 5,
        'other' => 0,
    ];

    $employeeIds = \App\Modules\Employees\Models\Employee::query()
        ->pluck('id')
        ->all();

    foreach ($employeeIds as $employeeId) {
        foreach ($defaults as $type => $totalDays) {
            \App\Modules\Leaves\Models\LeaveCredit::query()->updateOrCreate(
                [
                    'employee_id' => $employeeId,
                    'year' => $year,
                    'leave_type' => $type,
                ],
                [
                    'total_days' => $totalDays,
                    'used_days' => 0,
                ],
            );
        }
    }

    $this->info("Leave credits reset for year {$year}.");
})->purpose('Reset yearly leave credits for all employees');

Schedule::command('leaves:reset-credits')->yearlyOn(1, 1, '00:10');

Artisan::command('attendance:checkin-reminders', function () {
    $this->info('Check-in reminder job executed.');
})->purpose('Trigger check-in reminder dispatch (Mon–Sat)');

Schedule::command('attendance:checkin-reminders')->days([1, 2, 3, 4, 5, 6])->at('07:30');
Schedule::command('attendance:checkin-reminders')->days([1, 2, 3, 4, 5, 6])->at('07:40');
Schedule::command('attendance:checkin-reminders')->days([1, 2, 3, 4, 5, 6])->at('07:50');
Schedule::command('attendance:checkin-reminders')->days([1, 2, 3, 4, 5, 6])->at('07:55');
