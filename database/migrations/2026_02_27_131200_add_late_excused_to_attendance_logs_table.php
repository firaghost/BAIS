<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_logs', function (Blueprint $table): void {
            $table->boolean('late_excused')->default(false)->after('late_minutes');
            $table->index(['late_excused', 'log_date']);
        });
    }

    public function down(): void
    {
        Schema::table('attendance_logs', function (Blueprint $table): void {
            $table->dropIndex(['late_excused', 'log_date']);
            $table->dropColumn('late_excused');
        });
    }
};
