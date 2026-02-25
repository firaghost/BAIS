<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payroll_records', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->foreignId('user_id')->constrained('users');
            $table->string('month', 7);
            $table->unsignedSmallInteger('total_work_days')->default(0);
            $table->unsignedInteger('total_late_minutes')->default(0);
            $table->unsignedInteger('total_overtime_minutes')->default(0);
            $table->decimal('deduction_amount', 10, 2)->default(0);
            $table->timestamps();

            $table->unique(['user_id', 'month']);
            $table->index(['month']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_records');
    }
};
