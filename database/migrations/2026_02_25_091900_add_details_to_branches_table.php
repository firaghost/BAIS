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
            $table->string('address_line', 255)->nullable()->after('name');
            $table->string('city', 100)->nullable()->after('address_line');
            $table->string('state', 100)->nullable()->after('city');

            $table->foreignId('manager_employee_id')
                ->nullable()
                ->after('state')
                ->constrained('employees')
                ->nullOnDelete();

            $table->index(['city', 'state']);
        });
    }

    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table): void {
            $table->dropIndex(['city', 'state']);
            $table->dropConstrainedForeignId('manager_employee_id');
            $table->dropColumn(['address_line', 'city', 'state']);
        });
    }
};
