<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('attendance_logs')) {
            return;
        }

        if (Schema::hasColumn('attendance_logs', 'updated_at')) {
            return;
        }

        Schema::table('attendance_logs', function (Blueprint $table): void {
            $table->timestamp('updated_at')->nullable()->after('created_at');
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('attendance_logs')) {
            return;
        }

        if (!Schema::hasColumn('attendance_logs', 'updated_at')) {
            return;
        }

        Schema::table('attendance_logs', function (Blueprint $table): void {
            $table->dropColumn('updated_at');
        });
    }
};
