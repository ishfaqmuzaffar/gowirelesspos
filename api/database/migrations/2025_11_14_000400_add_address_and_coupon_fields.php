<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        // Add address to customers
        Schema::table('customers', function (Blueprint $t) {
            $t->string('address')->nullable()->after('phone');
        });

        // Add coupon_code to orders
        Schema::table('orders', function (Blueprint $t) {
            $t->string('coupon_code')->nullable()->after('status');
        });
    }

    public function down(): void {
        Schema::table('customers', function (Blueprint $t) {
            $t->dropColumn('address');
        });

        Schema::table('orders', function (Blueprint $t) {
            $t->dropColumn('coupon_code');
        });
    }
};
