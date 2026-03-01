<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('holidays')) {
            return;
        }

        Schema::create('holidays', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->string('country_code', 2)->default('ET');
            $table->date('holiday_date');
            $table->string('name', 150);
            $table->string('type', 30)->default('public');
            $table->boolean('is_active')->default(true);
            $table->string('source', 30)->default('manual');
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->unique(['country_code', 'holiday_date']);
            $table->index(['country_code', 'holiday_date', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('holidays');
    }
};
