<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
  public function up(): void {
    Schema::table('product_variants', function (Blueprint $t) {
      $t->json('attributes')->nullable()->after('barcode');
    });
  }

  public function down(): void {
    Schema::table('product_variants', function (Blueprint $t) {
      $t->dropColumn('attributes');
    });
  }
};
