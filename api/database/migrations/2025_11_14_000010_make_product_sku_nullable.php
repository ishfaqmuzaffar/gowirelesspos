<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('products', 'sku')) {
            // PostgreSQL: drop NOT NULL constraint on sku
            DB::statement('ALTER TABLE products ALTER COLUMN sku DROP NOT NULL');
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('products', 'sku')) {
            // Re-add NOT NULL if you ever roll back
            DB::statement('ALTER TABLE products ALTER COLUMN sku SET NOT NULL');
        }
    }
};
