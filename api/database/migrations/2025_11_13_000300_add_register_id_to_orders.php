<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('orders', function (Blueprint $t) {
            $t->foreignId('register_id')->nullable()->after('store_id')->constrained();
        });
    }

    public function down(): void {
        Schema::table('orders', function (Blueprint $t) {
            $t->dropConstrainedForeignId('register_id');
        });
    }
};
