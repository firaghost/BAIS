<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('devices')) {
            return;
        }

        Schema::table('devices', function (Blueprint $table): void {
            $table->foreignId('employee_id')->nullable()->after('user_id')->constrained('employees');
            $table->index(['employee_id', 'is_active']);
        });

        if (!Schema::hasTable('employees')) {
            return;
        }

        if (!Schema::hasColumn('devices', 'employee_id')) {
            return;
        }

        $driver = DB::getDriverName();
        if ($driver === 'sqlite') {
            DB::statement(
                "UPDATE devices SET employee_id = (SELECT e.id FROM employees e WHERE e.user_id = devices.user_id LIMIT 1) WHERE employee_id IS NULL"
            );

            return;
        }

        DB::statement(
            "UPDATE devices d JOIN employees e ON e.user_id = d.user_id SET d.employee_id = e.id WHERE d.employee_id IS NULL"
        );
    }

    public function down(): void
    {
        Schema::table('devices', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('employee_id');
        });
    }
};
