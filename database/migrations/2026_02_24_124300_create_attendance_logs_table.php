<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_logs', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->foreignId('user_id')->constrained('users');
            $table->foreignId('branch_id')->constrained('branches');

            $table->date('log_date');
            $table->timestamp('check_in_time');
            $table->timestamp('check_out_time')->nullable();

            $table->unsignedSmallInteger('late_minutes')->default(0);
            $table->unsignedSmallInteger('overtime_minutes')->default(0);
            $table->string('status', 30)->default('checked_in');

            $table->timestamps();

            $table->index(['user_id', 'log_date']);
            $table->index(['branch_id', 'log_date']);
            $table->index(['user_id', 'check_in_time']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_logs');
    }
};
