<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StockController extends Controller
{
    /**
     * GET /api/stock?store_id=1
     * List inventory for a store, including variant attributes.
     */
    public function index(Request $request)
    {
        $storeId = (int) $request->query('store_id', 1);

        $rows = DB::table('inventory_items as i')
            ->join('product_variants as v', 'v.id', '=', 'i.variant_id')
            ->join('products as p', 'p.id', '=', 'v.product_id')
            ->where('i.store_id', $storeId)
            ->select(
                'i.id',
                'i.store_id',
                'i.qty_on_hand',
                'i.reorder_point',
                'i.reorder_qty',
                'v.id as variant_id',
                'v.sku',
                'v.barcode',
                'v.attributes',
                'p.name as product_name',
                'p.main_image_path'
            )
            ->orderBy('p.name')
            ->orderBy('v.sku')
            ->get();

        return $rows->map(function ($row) {
            $attrs = $row->attributes ? json_decode($row->attributes, true) : null;
            $imageUrl = $row->main_image_path
                ? url('storage/' . $row->main_image_path)
                : null;

            return [
                'id'            => $row->id,
                'store_id'      => $row->store_id,
                'variant_id'    => $row->variant_id,
                'sku'           => $row->sku,
                'barcode'       => $row->barcode,
                'product'       => $row->product_name,
                'qty_on_hand'   => (float) $row->qty_on_hand,
                'reorder_point' => (float) $row->reorder_point,
                'reorder_qty'   => (float) $row->reorder_qty,
                'attributes'    => $attrs,
                'image_url'     => $imageUrl,
            ];
        });
    }

    /**
     * POST /api/stock/adjust
     * Body: { store_id, variant_id, qty, note }
     * qty can be + or - (e.g. +5, -3)
     */
    public function adjust(Request $request)
    {
        $data = $request->validate([
            'store_id'   => 'required|integer',
            'variant_id' => 'required|string',
            'qty'        => 'required|numeric',
            'note'       => 'nullable|string',
        ]);

        return DB::transaction(function () use ($data) {
            $storeId   = (int) $data['store_id'];
            $variantId = $data['variant_id'];
            $qty       = (float) $data['qty'];
            $note      = $data['note'] ?? null;
            $now       = now();

            $variant = DB::table('product_variants')->where('id', $variantId)->first();
            if (!$variant) {
                return response()->json(['error' => 'Variant not found'], 422);
            }

            $inv = DB::table('inventory_items')
                ->where('store_id', $storeId)
                ->where('variant_id', $variantId)
                ->lockForUpdate()
                ->first();

            if (!$inv) {
                $invId = DB::table('inventory_items')->insertGetId([
                    'store_id'      => $storeId,
                    'variant_id'    => $variantId,
                    'qty_on_hand'   => 0,
                    'reorder_point' => 0,
                    'reorder_qty'   => 0,
                    'created_at'    => $now,
                    'updated_at'    => $now,
                ]);

                $inv = DB::table('inventory_items')->where('id', $invId)->first();
            }

            DB::table('inventory_items')
                ->where('id', $inv->id)
                ->update([
                    'qty_on_hand' => DB::raw('qty_on_hand + ' . $qty),
                    'updated_at'  => $now,
                ]);

            DB::table('stock_moves')->insert([
                'store_id'   => $storeId,
                'variant_id' => $variantId,
                'qty'        => $qty,
                'type'       => 'adjust',
                'ref_id'     => null,
                'note'       => $note,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            return ['ok' => true];
        });
    }

    /**
     * POST /api/stock/transfer
     * Body: { from_store_id, to_store_id, variant_id, qty, note }
     */
    public function transfer(Request $request)
    {
        $data = $request->validate([
            'from_store_id' => 'required|integer|different:to_store_id',
            'to_store_id'   => 'required|integer',
            'variant_id'    => 'required|string',
            'qty'           => 'required|numeric|min:0.001',
            'note'          => 'nullable|string',
        ]);

        return DB::transaction(function () use ($data) {
            $fromId   = (int) $data['from_store_id'];
            $toId     = (int) $data['to_store_id'];
            $variantId = $data['variant_id'];
            $qty      = (float) $data['qty'];
            $note     = $data['note'] ?? 'Stock transfer';
            $now      = now();

            $variant = DB::table('product_variants')->where('id', $variantId)->first();
            if (!$variant) {
                return response()->json(['error' => 'Variant not found'], 422);
            }

            $invFrom = DB::table('inventory_items')
                ->where('store_id', $fromId)
                ->where('variant_id', $variantId)
                ->lockForUpdate()
                ->first();

            if (!$invFrom || (float) $invFrom->qty_on_hand < $qty) {
                return response()->json(['error' => 'Not enough stock in source store'], 422);
            }

            // Decrement from source
            DB::table('inventory_items')
                ->where('id', $invFrom->id)
                ->update([
                    'qty_on_hand' => DB::raw('qty_on_hand - ' . $qty),
                    'updated_at'  => $now,
                ]);

            // Ensure destination row exists
            $invTo = DB::table('inventory_items')
                ->where('store_id', $toId)
                ->where('variant_id', $variantId)
                ->lockForUpdate()
                ->first();

            if (!$invTo) {
                $invToId = DB::table('inventory_items')->insertGetId([
                    'store_id'      => $toId,
                    'variant_id'    => $variantId,
                    'qty_on_hand'   => 0,
                    'reorder_point' => 0,
                    'reorder_qty'   => 0,
                    'created_at'    => $now,
                    'updated_at'    => $now,
                ]);
                $invTo = DB::table('inventory_items')->where('id', $invToId)->first();
            }

            DB::table('inventory_items')
                ->where('id', $invTo->id)
                ->update([
                    'qty_on_hand' => DB::raw('qty_on_hand + ' . $qty),
                    'updated_at'  => $now,
                ]);

            // Log moves
            DB::table('stock_moves')->insert([
                [
                    'store_id'   => $fromId,
                    'variant_id' => $variantId,
                    'qty'        => -$qty,
                    'type'       => 'transfer',
                    'ref_id'     => null,
                    'note'       => $note . ' (out)',
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'store_id'   => $toId,
                    'variant_id' => $variantId,
                    'qty'        => $qty,
                    'type'       => 'transfer',
                    'ref_id'     => null,
                    'note'       => $note . ' (in)',
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            ]);

            return ['ok' => true];
        });
    }
}
