<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('transfers', function (Blueprint $t) {
            $t->id();
            $t->foreignId('from_store_id')->constrained('stores');
            $t->foreignId('to_store_id')->constrained('stores');
            $t->foreignId('created_by')->constrained('users');
            $t->string('status')->default('draft'); // draft, sent, received, cancelled
            $t->timestamps();
        });

        Schema::create('transfer_lines', function (Blueprint $t) {
            $t->id();
            $t->foreignId('transfer_id')->constrained('transfers')->cascadeOnDelete();
            $t->uuid('variant_id');
            $t->decimal('qty', 12, 3);
            $t->timestamps();

            $t->foreign('variant_id')->references('id')->on('product_variants')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transfer_lines');
        Schema::dropIfExists('transfers');
    }
};
