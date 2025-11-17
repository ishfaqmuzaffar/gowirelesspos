<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
  public function up(): void {
    Schema::table('products', function (Blueprint $t) {
      $t->unsignedBigInteger('woo_product_id')->nullable()->unique()->after('track_serial');
    });
    Schema::table('product_variants', function (Blueprint $t) {
      $t->unsignedBigInteger('woo_product_id')->nullable()->after('cost');
      $t->unsignedBigInteger('woo_variation_id')->nullable()->after('woo_product_id');
    });
  }

  public function down(): void {
    Schema::table('product_variants', function (Blueprint $t) {
      $t->dropColumn(['woo_product_id','woo_variation_id']);
    });
    Schema::table('products', function (Blueprint $t) {
      $t->dropColumn('woo_product_id');
    });
  }
};
