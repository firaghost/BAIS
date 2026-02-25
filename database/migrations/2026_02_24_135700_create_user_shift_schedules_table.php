<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_shift_schedules', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->foreignId('user_id')->constrained('users');
            $table->foreignId('shift_id')->constrained('shifts');
            $table->unsignedTinyInteger('day_of_week');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['user_id', 'day_of_week']);
            $table->index(['shift_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_shift_schedules');
    }
};
