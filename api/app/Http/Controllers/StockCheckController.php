<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StockCheckController extends Controller
{
    public function check(Request $request)
    {
        $data = $request->validate([
            'store_id' => 'required|integer',
            'lines'    => 'required|array|min:1',
            'lines.*.variant_id' => 'required|string',
            'lines.*.qty'        => 'required|numeric|min:0.001',
        ]);

        $storeId = (int) $data['store_id'];
        $problems = [];

        foreach ($data['lines'] as $line) {
            $variantId = $line['variant_id'];
            $required  = $line['qty'];

            // Get variant details (SKU, name)
            $variant = DB::table('product_variants')->where('id', $variantId)->first();
            if (!$variant) {
                $problems[] = [
                    'variant_id' => $variantId,
                    'sku' => 'UNKNOWN',
                    'available' => 0,
                    'required' => $required,
                    'difference' => -$required
                ];
                continue;
            }

            $inv = DB::table('inventory_items')
                ->where('store_id', $storeId)
                ->where('variant_id', $variantId)
                ->first();

            $available = $inv ? $inv->qty_on_hand : 0;

            if ($available < $required) {
                $problems[] = [
                    'variant_id' => $variantId,
                    'sku' => $variant->sku,
                    'available' => $available,
                    'required'  => $required,
                    'difference' => $available - $required
                ];
            }
        }

        if (count($problems) > 0) {
            return [
                'status' => 'insufficient',
                'problems' => $problems
            ];
        }

        return [ 'status' => 'ok' ];
    }
}
