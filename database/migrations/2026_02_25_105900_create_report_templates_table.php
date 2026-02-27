<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report_templates', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->string('name', 150)->unique();
            $table->string('category', 50)->default('standard');
            $table->string('default_format', 10)->default('json');
            $table->boolean('is_active')->default(true);
            $table->string('description', 255)->nullable();
            $table->json('definition')->nullable();
            $table->timestamps();

            $table->index(['category', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_templates');
    }
};
