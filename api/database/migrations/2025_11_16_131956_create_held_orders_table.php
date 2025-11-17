<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('held_orders', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('store_id');
            $table->unsignedBigInteger('register_id')->nullable();
            $table->unsignedBigInteger('user_id')->nullable();

            $table->string('type', 20)->default('held'); // 'held' | 'quote'

            // Simple customer snapshot
            $table->string('customer_name')->nullable();
            $table->string('customer_phone')->nullable();
            $table->string('customer_email')->nullable();
            $table->string('customer_address')->nullable();

            $table->string('status', 20)->default('open'); // 'open' | 'converted' | 'cancelled'

            $table->decimal('subtotal', 10, 2)->default(0);
            $table->decimal('discount_total', 10, 2)->default(0);
            $table->decimal('tax_total', 10, 2)->default(0);
            $table->decimal('total', 10, 2)->default(0);

            $table->string('coupon_code')->nullable();
            $table->decimal('coupon_amount', 10, 2)->default(0);

            $table->timestamps();

            $table->index(['store_id', 'register_id']);
            $table->index(['type', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('held_orders');
    }
};
