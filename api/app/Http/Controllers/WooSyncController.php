<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Services\WooService;
use Illuminate\Support\Str;

class WooSyncController extends Controller {

  public function syncProducts(Request $r, WooService $woo) {
    $maxPages = (int) $r->query('pages', 2); // limit for safety
    $perPage  = 50;

    $imported = 0;
    $skippedNoSku = 0;
    $simple = 0;
    $variable = 0;

    DB::beginTransaction();
    try {
      for ($page=1; $page <= $maxPages; $page++) {
        $products = $woo->fetchProductsPage($page, $perPage);
        if (empty($products)) break;

        foreach ($products as $p) {
          $sku = $p['sku'] ?? '';
          if ($sku === '') {
            $skippedNoSku++;
            continue;
          }

          if ($p['type'] === 'simple') {
            $simple++;
            $this->upsertSimple($p);
            $imported++;
          } elseif ($p['type'] === 'variable') {
            $variable++;
            $imported += $this->syncVariableProduct($woo, $p);
          } else {
            // ignore other types for now
          }
        }
      }

      DB::commit();
      return [
        'ok' => true,
        'imported' => $imported,
        'simple' => $simple,
        'variable' => $variable,
        'skipped_no_sku' => $skippedNoSku,
      ];
    } catch (\Throwable $e) {
      DB::rollBack();
      return response()->json([
        'ok'=>false,
        'error'=>$e->getMessage(),
      ], 500);
    }
  }

  protected function upsertSimple(array $p): void {
    // product
    $prodId = DB::table('products')->where('woo_product_id',$p['id'])->value('id');
    if (!$prodId) {
      $prodId = (string) Str::uuid();
      DB::table('products')->insert([
        'id'=>$prodId,
        'sku'=>$p['sku'] ?: ('WOO-'.$p['id']),
        'name'=>$p['name'] ?? ('Product '.$p['id']),
        'description'=>$p['description'] ?? '',
        'track_serial'=>false,
        'woo_product_id'=>$p['id'],
        'created_at'=>now(),'updated_at'=>now()
      ]);
    } else {
      DB::table('products')->where('id',$prodId)->update([
        'name'=>$p['name'] ?? ('Product '.$p['id']),
        'description'=>$p['description'] ?? '',
        'updated_at'=>now()
      ]);
    }

    // variant (1:1 with product for simple)
    $variant = DB::table('product_variants')
      ->where('woo_product_id',$p['id'])
      ->whereNull('woo_variation_id')
      ->first();

    $price = (float) ($p['price'] ?? $p['regular_price'] ?? 0);

    if (!$variant) {
      DB::table('product_variants')->insert([
        'id'=>(string) Str::uuid(),
        'product_id'=>$prodId,
        'sku'=>$p['sku'],
        'barcode'=>null,
        'price'=>$price,
        'cost'=>0,
        'woo_product_id'=>$p['id'],
        'woo_variation_id'=>null,
        'active'=>true,
        'created_at'=>now(),'updated_at'=>now()
      ]);
    } else {
      DB::table('product_variants')->where('id',$variant->id)->update([
        'sku'=>$p['sku'],
        'price'=>$price,
        'active'=>true,
        'updated_at'=>now()
      ]);
    }
  }

  protected function syncVariableProduct(WooService $woo, array $p): int {
    $imported = 0;

    // ensure product row exists
    $prodId = DB::table('products')->where('woo_product_id',$p['id'])->value('id');
    if (!$prodId) {
      $prodId = (string) Str::uuid();
      DB::table('products')->insert([
        'id'=>$prodId,
        'sku'=>$p['sku'] ?: ('WOO-'.$p['id']),
        'name'=>$p['name'] ?? ('Product '.$p['id']),
        'description'=>$p['description'] ?? '',
        'track_serial'=>false,
        'woo_product_id'=>$p['id'],
        'created_at'=>now(),'updated_at'=>now()
      ]);
    } else {
      DB::table('products')->where('id',$prodId)->update([
        'name'=>$p['name'] ?? ('Product '.$p['id']),
        'description'=>$p['description'] ?? '',
        'updated_at'=>now()
      ]);
    }

    // fetch variations
    $page = 1;
    do {
      $vars = $woo->fetchVariations($p['id'], $page, 100);
      if (empty($vars)) break;
      foreach ($vars as $v) {
        $sku = $v['sku'] ?? '';
        if ($sku === '') continue;

        $variant = DB::table('product_variants')
          ->where('woo_product_id',$p['id'])
          ->where('woo_variation_id',$v['id'])
          ->first();

        $price = (float) ($v['price'] ?? $v['regular_price'] ?? 0);

        if (!$variant) {
          DB::table('product_variants')->insert([
            'id'=>(string) Str::uuid(),
            'product_id'=>$prodId,
            'sku'=>$sku,
            'barcode'=>null,
            'price'=>$price,
            'cost'=>0,
            'woo_product_id'=>$p['id'],
            'woo_variation_id'=>$v['id'],
            'active'=>true,
            'created_at'=>now(),'updated_at'=>now()
          ]);
        } else {
          DB::table('product_variants')->where('id',$variant->id)->update([
            'sku'=>$sku,
            'price'=>$price,
            'active'=>true,
            'updated_at'=>now()
          ]);
        }
        $imported++;
      }
      $page++;
    } while (true);

    return $imported;
  }
}
