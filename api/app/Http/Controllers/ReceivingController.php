<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReceivingController extends Controller
{
    /**
     * Normalize request structure so we can accept:
     * - "lines" OR "items"
     * - "variant_id" OR "variantId"
     */
    protected function normalizeLines(Request $request): void
    {
        $input = $request->all();

        // If "items" was used instead of "lines", convert it.
        if (isset($input['items']) && !isset($input['lines'])) {
            $input['lines'] = $input['items'];
        }

        if (isset($input['lines']) && is_array($input['lines'])) {
            foreach ($input['lines'] as $i => $line) {
                // If "variantId" was used instead of "variant_id", convert it.
                if (isset($line['variantId']) && !isset($line['variant_id'])) {
                    $input['lines'][$i]['variant_id'] = $line['variantId'];
                }
            }
        }

        $request->replace($input);
    }

    /**
     * POST /api/receiving/po
     * Create a purchase order header.
     *
     * Now we support supplier_id + external_ref.
     */
    public function createPo(Request $request)
    {
        $this->normalizeLines($request);

        $data = $request->validate([
            'store_id'       => ['required', 'integer', 'exists:stores,id'],
            'supplier_id'    => ['nullable', 'integer', 'exists:suppliers,id'],
            'supplier_name'  => ['nullable', 'string', 'max:255'], // UI-only for now
            'external_ref'   => ['nullable', 'string', 'max:255'],
            'lines'          => ['required', 'array', 'min:1'],
            'lines.*.variant_id' => ['required', 'string', 'exists:product_variants,id'],
            'lines.*.qty'    => ['required', 'numeric', 'min:0.0001'],
            'lines.*.cost'   => ['nullable', 'numeric', 'min:0'],
        ]);

        DB::beginTransaction();

        try {
            $poId = DB::table('purchase_orders')->insertGetId([
                'store_id'     => $data['store_id'],
                'supplier_id'  => $data['supplier_id'] ?? null,
                'external_ref' => $data['external_ref'] ?? null,
                'status'       => 'open',
                'created_at'   => now(),
                'updated_at'   => now(),
            ]);

            // We are NOT storing lines anywhere yet (no po_lines table).
            // Lines are validated to keep the UI safe; stock impact happens on /receive.

            DB::commit();

            return response()->json([
                'ok'    => true,
                'id'    => $poId,
                'po_id' => $poId,
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            report($e);

            return response()->json([
                'error'  => 'Failed to create purchase order.',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/receiving/receive
     * Receive stock against a PO into a store's inventory.
     */
    public function receive(Request $request)
    {
        $this->normalizeLines($request);

        $data = $request->validate([
            'store_id'          => ['required', 'integer', 'exists:stores,id'],
            'po_id'             => ['required', 'integer', 'exists:purchase_orders,id'],
            'note'              => ['nullable', 'string', 'max:1000'],
            'lines'             => ['required', 'array', 'min:1'],
            'lines.*.variant_id'=> ['required', 'string', 'exists:product_variants,id'],
            'lines.*.qty'       => ['required', 'numeric', 'min:0.0001'],
        ]);

        DB::beginTransaction();

        try {
            $storeId = $data['store_id'];
            $poId    = $data['po_id'];
            $note    = $data['note'] ?? null;

            foreach ($data['lines'] as $line) {
                $variantId = $line['variant_id'];
                $qty       = $line['qty'];

                // Upsert into inventory_items
                $inv = DB::table('inventory_items')
                    ->where('store_id', $storeId)
                    ->where('variant_id', $variantId)
                    ->lockForUpdate()
                    ->first();

                if ($inv) {
                    DB::table('inventory_items')
                        ->where('id', $inv->id)
                        ->update([
                            'qty_on_hand' => $inv->qty_on_hand + $qty,
                            'updated_at'  => now(),
                        ]);
                } else {
                    DB::table('inventory_items')->insert([
                        'store_id'     => $storeId,
                        'variant_id'   => $variantId,
                        'qty_on_hand'  => $qty,
                        'reorder_point'=> 0,
                        'reorder_qty'  => 0,
                        'created_at'   => now(),
                        'updated_at'   => now(),
                    ]);
                }

                // Log stock move (type = receive), ref_id = po_id
                DB::table('stock_moves')->insert([
                    'store_id'   => $storeId,
                    'variant_id' => $variantId,
                    'qty'        => $qty,
                    'type'       => 'receive',
                    'ref_id'     => $poId,
                    'note'       => $note,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            DB::commit();

            return response()->json([
                'ok'    => true,
                'po_id' => $poId,
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            report($e);

            return response()->json([
                'error'  => 'Failed to receive stock.',
                'detail' => $e->getMessage(),
            ], 500);
        }
    }
}