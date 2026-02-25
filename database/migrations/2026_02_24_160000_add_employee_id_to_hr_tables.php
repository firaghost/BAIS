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
        Schema::table('attendance_logs', function (Blueprint $table): void {
            $table->foreignId('employee_id')->nullable()->after('user_id')->constrained('employees');
            $table->index(['employee_id', 'log_date']);
        });

        Schema::table('leave_requests', function (Blueprint $table): void {
            $table->foreignId('employee_id')->nullable()->after('user_id')->constrained('employees');
            $table->index(['employee_id', 'status']);
        });

        Schema::table('payroll_records', function (Blueprint $table): void {
            $table->foreignId('employee_id')->nullable()->after('user_id')->constrained('employees');
            $table->index(['employee_id', 'month']);
        });

        Schema::table('user_shift_schedules', function (Blueprint $table): void {
            $table->foreignId('employee_id')->nullable()->after('user_id')->constrained('employees');
            $table->index(['employee_id']);
        });

        DB::statement(
            'UPDATE attendance_logs al JOIN employees e ON e.user_id = al.user_id SET al.employee_id = e.id WHERE al.employee_id IS NULL'
        );

        DB::statement(
            'UPDATE leave_requests lr JOIN employees e ON e.user_id = lr.user_id SET lr.employee_id = e.id WHERE lr.employee_id IS NULL'
        );

        DB::statement(
            'UPDATE payroll_records pr JOIN employees e ON e.user_id = pr.user_id SET pr.employee_id = e.id WHERE pr.employee_id IS NULL'
        );

        DB::statement(
            'UPDATE user_shift_schedules uss JOIN employees e ON e.user_id = uss.user_id SET uss.employee_id = e.id WHERE uss.employee_id IS NULL'
        );
    }

    public function down(): void
    {
        Schema::table('attendance_logs', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('employee_id');
        });

        Schema::table('leave_requests', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('employee_id');
        });

        Schema::table('payroll_records', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('employee_id');
        });

        Schema::table('user_shift_schedules', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('employee_id');
        });
    }
};
