<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('loyalty_transactions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('customer_id');
            $table->unsignedBigInteger('order_id')->nullable();
            $table->unsignedBigInteger('refund_id')->nullable();

            // earn, redeem, adjust, refund_revoke (we'll use earn/redeem/refund_adjust)
            $table->string('type', 30);

            // positive for earn, negative for removal, negative for redeem
            $table->integer('points');

            $table->string('note')->nullable();

            $table->timestamps();

            $table->index('customer_id');
            $table->index('order_id');
            $table->index('refund_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_transactions');
    }
};
