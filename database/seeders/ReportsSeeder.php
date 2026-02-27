<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Modules\Reports\Models\ReportTemplate;
use Illuminate\Database\Seeder;

class ReportsSeeder extends Seeder
{
    public function run(): void
    {
        ReportTemplate::query()->firstOrCreate(
            ['name' => 'Quarterly Regulatory Report'],
            [
                'category' => 'standard',
                'default_format' => 'json',
                'is_active' => true,
                'description' => 'Compliance audit summary for banking regulations.',
                'definition' => ['metrics' => ['late_arrivals', 'device_downtime']],
            ],
        );

        ReportTemplate::query()->firstOrCreate(
            ['name' => 'Device Health Audit'],
            [
                'category' => 'standard',
                'default_format' => 'csv',
                'is_active' => true,
                'description' => 'Detailed uptime and failure logs for all devices.',
                'definition' => ['metrics' => ['device_downtime']],
            ],
        );

        ReportTemplate::query()->firstOrCreate(
            ['name' => 'Absenteeism Analysis'],
            [
                'category' => 'standard',
                'default_format' => 'json',
                'is_active' => true,
                'description' => 'Trends in unexcused absences across departments.',
                'definition' => ['metrics' => ['late_arrivals']],
            ],
        );

        ReportTemplate::query()->firstOrCreate(
            ['name' => 'Overtime Utilization'],
            [
                'category' => 'standard',
                'default_format' => 'json',
                'is_active' => true,
                'description' => 'Cost analysis of overtime hours vs. standard shifts.',
                'definition' => ['metrics' => ['total_hours']],
            ],
        );
    }
}
