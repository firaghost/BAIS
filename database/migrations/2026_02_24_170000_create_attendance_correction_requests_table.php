<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_correction_requests', function (Blueprint $table): void {
            $table->bigIncrements('id');

            $table->foreignId('attendance_log_id')->constrained('attendance_logs');
            $table->foreignId('user_id')->constrained('users');
            $table->foreignId('employee_id')->nullable()->constrained('employees');

            $table->timestamp('proposed_check_in_time')->nullable();
            $table->timestamp('proposed_check_out_time')->nullable();

            $table->string('status', 20)->default('pending');
            $table->text('reason');

            $table->foreignId('reviewed_by')->nullable()->constrained('users');
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_comment')->nullable();

            $table->timestamps();

            $table->index(['attendance_log_id', 'status']);
            $table->index(['user_id', 'status']);
            $table->index(['employee_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_correction_requests');
    }
};
