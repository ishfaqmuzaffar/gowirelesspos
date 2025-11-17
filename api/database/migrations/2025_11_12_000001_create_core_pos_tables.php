<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create("organizations", function (Blueprint $t) {
            $t->id(); $t->string("name"); $t->timestamps();
        });
        Schema::create("stores", function (Blueprint $t) {
            $t->id(); $t->foreignId("organization_id")->constrained();
            $t->string("name"); $t->string("code")->unique();
            $t->string("address")->nullable(); $t->string("timezone")->default("America/Belize");
            $t->timestamps();
        });
        Schema::create("registers", function (Blueprint $t) {
            $t->id(); $t->foreignId("store_id")->constrained();
            $t->string("name"); $t->string("device_key")->unique(); $t->boolean("is_active")->default(true);
            $t->timestamps();
        });
        Schema::create("products", function (Blueprint $t) {
            $t->uuid("id")->primary(); $t->string("sku")->unique(); $t->string("name");
            $t->text("description")->nullable(); $t->boolean("track_serial")->default(false); $t->timestamps();
        });
        Schema::create("product_variants", function (Blueprint $t) {
            $t->uuid("id")->primary(); $t->uuid("product_id");
            $t->string("sku")->unique(); $t->string("barcode")->nullable();
            $t->decimal("price",12,2); $t->decimal("cost",12,2)->default(0); $t->boolean("active")->default(true); $t->timestamps();
            $t->foreign("product_id")->references("id")->on("products")->cascadeOnDelete();
        });
        Schema::create("inventory_items", function (Blueprint $t) {
            $t->id(); $t->foreignId("store_id")->constrained(); $t->uuid("variant_id");
            $t->decimal("qty_on_hand",12,3)->default(0); $t->decimal("reorder_point",12,3)->default(0); $t->decimal("reorder_qty",12,3)->default(0);
            $t->timestamps(); $t->foreign("variant_id")->references("id")->on("product_variants")->cascadeOnDelete();
            $t->unique(["store_id","variant_id"]);
        });
        Schema::create("serials", function (Blueprint $t) {
            $t->uuid("id")->primary(); $t->uuid("variant_id"); $t->foreignId("store_id")->nullable()->constrained("stores");
            $t->string("serial")->unique(); $t->enum("status",["available","sold","returned","rma"])->default("available"); $t->timestamps();
            $t->foreign("variant_id")->references("id")->on("product_variants")->cascadeOnDelete();
        });
        Schema::create("customers", function (Blueprint $t) {
            $t->id(); $t->string("name"); $t->string("email")->nullable()->unique(); $t->string("phone")->nullable(); $t->string("price_tier")->default("retail"); $t->timestamps();
        });
        Schema::create("orders", function (Blueprint $t) {
            $t->id(); $t->foreignId("store_id")->constrained(); $t->foreignId("user_id")->constrained();
            $t->foreignId("customer_id")->nullable()->constrained(); $t->enum("source",["POS","WEB"])->default("POS");
            $t->string("status")->default("completed"); $t->decimal("subtotal",12,2)->default(0); $t->decimal("discount_total",12,2)->default(0);
            $t->decimal("tax_total",12,2)->default(0); $t->decimal("total",12,2)->default(0); $t->timestamps();
        });
        Schema::create("order_lines", function (Blueprint $t) {
            $t->id(); $t->foreignId("order_id")->constrained("orders")->cascadeOnDelete(); $t->uuid("variant_id");
            $t->string("name"); $t->decimal("qty",12,3); $t->decimal("price",12,2); $t->decimal("discount",12,2)->default(0);
            $t->decimal("tax",12,2)->default(0); $t->decimal("total",12,2); $t->uuid("serial_id")->nullable(); $t->timestamps();
            $t->foreign("variant_id")->references("id")->on("product_variants");
        });
        Schema::create("payments", function (Blueprint $t) {
            $t->id(); $t->foreignId("order_id")->constrained("orders")->cascadeOnDelete(); $t->string("method"); $t->decimal("amount",12,2); $t->string("txn_ref")->nullable(); $t->timestamps();
        });
        Schema::create("stock_moves", function (Blueprint $t) {
            $t->id(); $t->foreignId("store_id")->constrained(); $t->uuid("variant_id"); $t->decimal("qty",12,3);
            $t->enum("type",["sale","return","adjust","transfer","receive"]); $t->unsignedBigInteger("ref_id")->nullable(); $t->text("note")->nullable(); $t->timestamps();
            $t->foreign("variant_id")->references("id")->on("product_variants");
        });
    }
    public function down(): void {
        Schema::dropIfExists("stock_moves"); Schema::dropIfExists("payments"); Schema::dropIfExists("order_lines"); Schema::dropIfExists("orders");
        Schema::dropIfExists("customers"); Schema::dropIfExists("serials"); Schema::dropIfExists("inventory_items"); Schema::dropIfExists("product_variants");
        Schema::dropIfExists("products"); Schema::dropIfExists("registers"); Schema::dropIfExists("stores"); Schema::dropIfExists("organizations");
    }
};
