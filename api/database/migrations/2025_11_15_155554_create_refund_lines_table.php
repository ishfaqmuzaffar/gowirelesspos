<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('refund_lines', function (Blueprint $table) {
            $table->id();

            // Refund itself uses big integer (refunds table has bigIncrements)
            $table->unsignedBigInteger('refund_id');

            // Your products and variants use UUID primary keys,
            // so we must use uuid() here to match.
            $table->uuid('product_id');
            $table->uuid('variant_id')->nullable();

            $table->integer('qty');
            $table->decimal('price', 10, 2);
            $table->decimal('total', 10, 2);
            $table->timestamps();

            // Foreign keys
            $table->foreign('refund_id')
                ->references('id')
                ->on('refunds')
                ->onDelete('cascade');

            $table->foreign('product_id')
                ->references('id')
                ->on('products');

            $table->foreign('variant_id')
                ->references('id')
                ->on('product_variants'); // adjust table name if yours is different
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('refund_lines');
    }
};
