<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employees', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->string('employee_code', 20)->unique();
            $table->unsignedSmallInteger('join_year');
            $table->unsignedInteger('sequence');

            $table->foreignId('user_id')->nullable()->constrained('users');
            $table->foreignId('branch_id')->nullable()->constrained('branches');

            $table->string('first_name', 100);
            $table->string('middle_name', 100)->nullable();
            $table->string('last_name', 100);
            $table->string('phone', 30)->nullable();
            $table->string('email', 150)->nullable();
            $table->string('job_title', 150)->nullable();
            $table->string('department', 150)->nullable();
            $table->date('hire_date');
            $table->string('status', 20)->default('active');
            $table->string('photo_path', 255)->nullable();

            $table->timestamps();

            $table->unique(['join_year', 'sequence']);
            $table->unique(['user_id']);
            $table->index(['branch_id']);
            $table->index(['last_name', 'first_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};
