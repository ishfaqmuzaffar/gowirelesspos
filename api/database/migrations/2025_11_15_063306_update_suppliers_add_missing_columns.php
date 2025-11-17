<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('suppliers', function (Blueprint $table) {
            if (!Schema::hasColumn('suppliers', 'contact_name')) {
                $table->string('contact_name')->nullable();
            }
            if (!Schema::hasColumn('suppliers', 'phone')) {
                $table->string('phone')->nullable();
            }
            if (!Schema::hasColumn('suppliers', 'email')) {
                $table->string('email')->nullable();
            }
            if (!Schema::hasColumn('suppliers', 'city')) {
                $table->string('city')->nullable();
            }
            if (!Schema::hasColumn('suppliers', 'address')) {
                $table->text('address')->nullable();
            }
            if (!Schema::hasColumn('suppliers', 'notes')) {
                $table->text('notes')->nullable();
            }
            if (!Schema::hasColumn('suppliers', 'active')) {
                $table->boolean('active')->default(true);
            }
        });
    }

    public function down(): void
    {
        Schema::table('suppliers', function (Blueprint $table) {
            if (Schema::hasColumn('suppliers', 'contact_name')) {
                $table->dropColumn('contact_name');
            }
            if (Schema::hasColumn('suppliers', 'phone')) {
                $table->dropColumn('phone');
            }
            if (Schema::hasColumn('suppliers', 'email')) {
                $table->dropColumn('email');
            }
            if (Schema::hasColumn('suppliers', 'city')) {
                $table->dropColumn('city');
            }
            if (Schema::hasColumn('suppliers', 'address')) {
                $table->dropColumn('address');
            }
            if (Schema::hasColumn('suppliers', 'notes')) {
                $table->dropColumn('notes');
            }
            if (Schema::hasColumn('suppliers', 'active')) {
                $table->dropColumn('active');
            }
        });
    }
};
