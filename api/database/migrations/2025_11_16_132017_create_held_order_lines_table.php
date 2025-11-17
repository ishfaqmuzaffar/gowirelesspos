<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('held_order_lines', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('held_order_id');
            $table->uuid('product_id')->nullable();
            $table->uuid('variant_id');

            $table->string('sku');
            $table->string('name');
            $table->json('attributes')->nullable();

            $table->decimal('qty', 10, 2);
            $table->decimal('price', 10, 2);
            $table->decimal('total', 10, 2);

            $table->timestamps();

            $table->index('held_order_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('held_order_lines');
    }
};
