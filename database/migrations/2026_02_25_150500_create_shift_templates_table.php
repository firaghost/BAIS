<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('shift_templates')) {
            return;
        }

        Schema::create('shift_templates', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->string('code', 20)->unique();
            $table->string('name', 150);
            $table->time('start_time');
            $table->time('end_time');
            $table->unsignedSmallInteger('break_minutes')->default(0);
            $table->string('status', 20)->default('active');
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();

            $table->index(['archived_at', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shift_templates');
    }
};
