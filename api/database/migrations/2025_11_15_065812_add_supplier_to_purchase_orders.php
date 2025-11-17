<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table) {
            if (!Schema::hasColumn('purchase_orders', 'supplier_id')) {
                $table->unsignedBigInteger('supplier_id')->nullable()->index();
                $table->foreign('supplier_id')
                    ->references('id')
                    ->on('suppliers')
                    ->nullOnDelete();
            }

            if (!Schema::hasColumn('purchase_orders', 'external_ref')) {
                $table->string('external_ref')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table) {
            if (Schema::hasColumn('purchase_orders', 'supplier_id')) {
                // drop foreign key, then column
                $table->dropForeign(['supplier_id']);
                $table->dropColumn('supplier_id');
            }

            if (Schema::hasColumn('purchase_orders', 'external_ref')) {
                $table->dropColumn('external_ref');
            }
        });
    }
};