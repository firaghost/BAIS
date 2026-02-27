<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leave_credits', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->foreignId('employee_id')->constrained('employees');
            $table->unsignedSmallInteger('year');
            $table->string('leave_type', 50);
            $table->unsignedSmallInteger('total_days');
            $table->unsignedSmallInteger('used_days')->default(0);
            $table->timestamps();

            $table->unique(['employee_id', 'year', 'leave_type']);
            $table->index(['year', 'leave_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leave_credits');
    }
};
