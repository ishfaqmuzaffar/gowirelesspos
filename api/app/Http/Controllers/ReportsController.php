<?php
namespace App\Http\Controllers;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;

class ReportsController extends Controller {
  public function lowStock(Request $r){
    $storeId = (int) $r->query("store_id",1);
    return DB::table("inventory_items as i")
      ->join("product_variants as v","v.id","=","i.variant_id")
      ->join("products as p","p.id","=","v.product_id")
      ->where("i.store_id",$storeId)
      ->whereColumn("i.qty_on_hand","<=","i.reorder_point")
      ->orderBy("i.qty_on_hand")
      ->get(["v.sku","p.name as product","i.qty_on_hand","i.reorder_point"]);
  }
  public function topSellers(Request $r){
    $days = (int) ($r->query("days",30));
    return DB::table("order_lines as l")
      ->join("orders as o","o.id","=","l.order_id")
      ->join("product_variants as v","v.id","=","l.variant_id")
      ->join("products as p","p.id","=","v.product_id")
      ->where("o.created_at",">=",now()->subDays($days))
      ->groupBy("l.variant_id","v.sku","p.name")
      ->orderByDesc(DB::raw("SUM(l.qty)"))
      ->limit(20)
      ->get([DB::raw("SUM(l.qty) as units"),"v.sku","p.name as product"]);
  }
}
