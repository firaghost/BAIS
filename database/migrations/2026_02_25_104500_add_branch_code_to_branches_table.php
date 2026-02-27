<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('branches', function (Blueprint $table): void {
            $table->string('branch_code', 50)->nullable()->unique()->after('id');
            $table->index(['branch_code']);
        });
    }

    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table): void {
            $table->dropIndex(['branch_code']);
            $table->dropUnique(['branch_code']);
            $table->dropColumn('branch_code');
        });
    }
};
