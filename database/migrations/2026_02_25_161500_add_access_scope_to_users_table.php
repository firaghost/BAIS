<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('access_scope_type', 20)->default('global')->after('must_change_password');
            $table->foreignId('access_scope_branch_id')->nullable()->after('access_scope_type')->constrained('branches')->nullOnDelete();
            $table->string('access_scope_region', 150)->nullable()->after('access_scope_branch_id');

            $table->index(['access_scope_type', 'access_scope_branch_id']);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropIndex(['access_scope_type', 'access_scope_branch_id']);
            $table->dropConstrainedForeignId('access_scope_branch_id');
            $table->dropColumn('access_scope_type');
            $table->dropColumn('access_scope_region');
        });
    }
};
