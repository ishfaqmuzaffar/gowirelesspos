<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('cash_transactions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('register_session_id');
            $table->unsignedBigInteger('user_id');
            $table->string('type', 20); // 'in', 'out', 'payout', 'drop'
            $table->decimal('amount', 10, 2); // always positive
            $table->string('reason')->nullable();
            $table->timestamps();

            $table->index('register_session_id');
            // $table->foreign('register_session_id')->references('id')->on('register_sessions');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_transactions');
    }
};
