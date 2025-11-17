<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder; use Illuminate\Support\Facades\DB; use Illuminate\Support\Str;
class ProductSampleSeeder extends Seeder {
  public function run(): void {
    $pid = (string) Str::uuid();
    DB::table("products")->insert(["id"=>$pid,"sku"=>"PHONE-BASE","name"=>"Sample Phone","description"=>"Demo","track_serial"=>false,"created_at"=>now(),"updated_at"=>now()]);
    $vid = (string) Str::uuid();
    DB::table("product_variants")->insert(["id"=>$vid,"product_id"=>$pid,"sku"=>"PHONE-BASE-01","barcode"=>"1234567890123","price"=>199.00,"cost"=>150.00,"active"=>true,"created_at"=>now(),"updated_at"=>now()]);
    DB::table("inventory_items")->insert(["store_id"=>1,"variant_id"=>$vid,"qty_on_hand"=>10,"reorder_point"=>1,"reorder_qty"=>5,"created_at"=>now(),"updated_at"=>now()]);
  }
}
