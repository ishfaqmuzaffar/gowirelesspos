<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('refund_payments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('refund_id');
            $table->string('method');
            $table->decimal('amount', 10, 2);
            $table->timestamps();

            $table->foreign('refund_id')->references('id')->on('refunds')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('refund_payments');
    }
};
