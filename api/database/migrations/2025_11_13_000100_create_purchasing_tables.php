<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
  public function up(): void {
    Schema::create('suppliers', function(Blueprint $t){
      $t->id(); $t->string('name'); $t->string('email')->nullable(); $t->string('phone')->nullable(); $t->timestamps();
    });

    Schema::create('purchase_orders', function(Blueprint $t){
      $t->id();
      $t->foreignId('store_id')->constrained('stores');
      $t->foreignId('supplier_id')->nullable()->constrained('suppliers');
      $t->string('status')->default('open'); // open, received, partial, cancelled
      $t->decimal('total',12,2)->default(0);
      $t->timestamps();
    });

    Schema::create('purchase_lines', function(Blueprint $t){
      $t->id();
      $t->foreignId('purchase_order_id')->constrained('purchase_orders')->cascadeOnDelete();
      $t->uuid('variant_id');
      $t->decimal('qty',12,3);
      $t->decimal('cost',12,2)->default(0);
      $t->decimal('received_qty',12,3)->default(0);
      $t->timestamps();
      $t->foreign('variant_id')->references('id')->on('product_variants');
    });

    Schema::create('purchase_receipts', function(Blueprint $t){
      $t->id();
      $t->foreignId('purchase_order_id')->constrained('purchase_orders')->cascadeOnDelete();
      $t->foreignId('store_id')->constrained('stores');
      $t->uuid('variant_id');
      $t->decimal('qty',12,3);
      $t->timestamps();
      $t->foreign('variant_id')->references('id')->on('product_variants');
    });
  }

  public function down(): void {
    Schema::dropIfExists('purchase_receipts');
    Schema::dropIfExists('purchase_lines');
    Schema::dropIfExists('purchase_orders');
    Schema::dropIfExists('suppliers');
  }
};
