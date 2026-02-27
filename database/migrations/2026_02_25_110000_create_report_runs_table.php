<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report_runs', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->string('name', 150);
            $table->string('trigger', 20);
            $table->string('format', 10);
            $table->string('status', 20);
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->date('from_date')->nullable();
            $table->date('to_date')->nullable();
            $table->foreignId('created_by_user_id')->constrained('users');
            $table->foreignId('template_id')->nullable()->constrained('report_templates')->nullOnDelete();
            $table->json('definition')->nullable();
            $table->json('result')->nullable();
            $table->timestamps();

            $table->index(['created_by_user_id', 'created_at']);
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_runs');
    }
};
