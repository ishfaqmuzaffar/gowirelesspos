<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Add refund tracking columns to your ORDERS table
            $table->decimal('refunded_total', 10, 2)
                ->default(0);

            $table->string('refund_status')
                ->default('none'); // values: none, partial, full
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['refunded_total', 'refund_status']);
        });
    }
};
