<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->integer('loyalty_points_balance')
                ->default(0)
                ->after('address');
            $table->integer('loyalty_points_lifetime_earned')
                ->default(0)
                ->after('loyalty_points_balance');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn([
                'loyalty_points_balance',
                'loyalty_points_lifetime_earned',
            ]);
        });
    }
};
