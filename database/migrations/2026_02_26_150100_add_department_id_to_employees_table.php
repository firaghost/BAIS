<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('employees')) {
            return;
        }

        if (Schema::hasColumn('employees', 'department_id')) {
            return;
        }

        Schema::table('employees', function (Blueprint $table): void {
            $table->foreignId('department_id')->nullable()->after('branch_id')->constrained('departments');
            $table->index(['department_id']);
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('employees')) {
            return;
        }

        Schema::table('employees', function (Blueprint $table): void {
            if (Schema::hasColumn('employees', 'department_id')) {
                $table->dropConstrainedForeignId('department_id');
            }
        });
    }
};
