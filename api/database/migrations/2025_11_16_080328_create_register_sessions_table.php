<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('register_sessions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('store_id');
            $table->unsignedBigInteger('register_id');
            $table->unsignedBigInteger('user_id'); // opened by
            $table->decimal('opening_amount', 10, 2)->default(0);
            $table->decimal('expected_cash', 10, 2)->default(0);
            $table->decimal('counted_cash', 10, 2)->nullable();
            $table->decimal('difference', 10, 2)->nullable();
            $table->string('status', 20); // 'open' | 'closed'
            $table->timestamp('opened_at');
            $table->timestamp('closed_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['register_id', 'status']);
            $table->index(['store_id', 'register_id']);

            // optional FKs if you want
            // $table->foreign('store_id')->references('id')->on('stores');
            // $table->foreign('register_id')->references('id')->on('registers');
            // $table->foreign('user_id')->references('id')->on('users');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('register_sessions');
    }
};
