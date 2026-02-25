<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leave_requests', function (Blueprint $table): void {
            $table->foreignId('manager_approved_by')->nullable()->after('approved_by')->constrained('users');
            $table->timestamp('manager_approved_at')->nullable()->after('manager_approved_by');

            $table->foreignId('hr_approved_by')->nullable()->after('manager_approved_at')->constrained('users');
            $table->timestamp('hr_approved_at')->nullable()->after('hr_approved_by');

            $table->text('rejection_reason')->nullable()->after('reason');

            $table->index(['status', 'manager_approved_by']);
            $table->index(['status', 'hr_approved_by']);
        });
    }

    public function down(): void
    {
        Schema::table('leave_requests', function (Blueprint $table): void {
            $table->dropIndex(['status', 'manager_approved_by']);
            $table->dropIndex(['status', 'hr_approved_by']);

            $table->dropColumn('rejection_reason');

            $table->dropColumn('hr_approved_at');
            $table->dropConstrainedForeignId('hr_approved_by');

            $table->dropColumn('manager_approved_at');
            $table->dropConstrainedForeignId('manager_approved_by');
        });
    }
};
