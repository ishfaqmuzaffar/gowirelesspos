<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TransferController extends Controller
{
    public function index()
    {
        return DB::table('transfers as t')
            ->join('stores as s1', 's1.id', '=', 't.from_store_id')
            ->join('stores as s2', 's2.id', '=', 't.to_store_id')
            ->join('users as u', 'u.id', '=', 't.created_by')
            ->select(
                't.id',
                's1.name as from_store',
                's2.name as to_store',
                't.status',
                'u.name as created_by',
                't.created_at'
            )
            ->orderByDesc('t.id')
            ->limit(100)
            ->get();
    }

    public function store(Request $r)
    {
        $r->validate([
            'from_store_id' => 'required|integer',
            'to_store_id'   => 'required|integer',
        ]);

        $id = DB::table('transfers')->insertGetId([
            'from_store_id' => $r->from_store_id,
            'to_store_id'   => $r->to_store_id,
            'created_by'    => auth()->id() ?? 1,
            'status'        => 'draft',
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);

        return ['ok' => true, 'id' => $id];
    }

    public function addLine($id, Request $r)
    {
        $r->validate([
            'variant_id' => 'required|string',
            'qty'        => 'required|numeric|min:0.001',
        ]);

        // Only allow adding lines in draft status
        $transfer = DB::table('transfers')->where('id', $id)->first();
        if (! $transfer) {
            return response()->json(['error' => 'Transfer not found'], 404);
        }
        if (! in_array($transfer->status, ['draft', 'sent'])) {
            return response()->json(['error' => 'Cannot modify this transfer'], 400);
        }

        DB::table('transfer_lines')->insert([
            'transfer_id' => $id,
            'variant_id'  => $r->variant_id,
            'qty'         => $r->qty,
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        return ['ok' => true];
    }

    public function send($id)
    {
        $transfer = DB::table('transfers')->where('id', $id)->first();
        if (! $transfer) {
            return response()->json(['error' => 'Transfer not found'], 404);
        }
        if ($transfer->status === 'cancelled') {
            return response()->json(['error' => 'Cancelled transfer cannot be sent'], 400);
        }
        if ($transfer->status === 'received') {
            return response()->json(['error' => 'Already received'], 400);
        }

        DB::table('transfers')->where('id', $id)->update([
            'status'     => 'sent',
            'updated_at' => now(),
        ]);

        return ['ok' => true];
    }

    public function receive($id)
    {
        return DB::transaction(function () use ($id) {
            $transfer = DB::table('transfers')
                ->where('id', $id)
                ->lockForUpdate()
                ->first();

            if (! $transfer) {
                return response()->json(['error' => 'Transfer not found'], 404);
            }

            if ($transfer->status === 'received') {
                return response()->json(['error' => 'Transfer already received'], 400);
            }

            if ($transfer->status !== 'sent') {
                return response()->json(['error' => 'Transfer must be sent before receiving'], 400);
            }

            $lines = DB::table('transfer_lines')
                ->where('transfer_id', $id)
                ->get();

            if ($lines->isEmpty()) {
                return response()->json(['error' => 'No lines on this transfer'], 400);
            }

            foreach ($lines as $line) {
                // 1) FROM store: stock moves (negative) + inventory decrement
                DB::table('stock_moves')->insert([
                    'store_id'   => $transfer->from_store_id,
                    'variant_id' => $line->variant_id,
                    'qty'        => -1 * $line->qty,
                    'type'       => 'transfer',
                    'ref_id'     => $id,
                    'note'       => 'Transfer out',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                DB::statement("
                    INSERT INTO inventory_items (store_id, variant_id, qty_on_hand, created_at, updated_at)
                    VALUES (?, ?, ?, now(), now())
                    ON CONFLICT (store_id, variant_id)
                    DO UPDATE SET qty_on_hand = inventory_items.qty_on_hand + EXCLUDED.qty_on_hand
                ", [
                    $transfer->from_store_id,
                    $line->variant_id,
                    -1 * $line->qty,
                ]);

                // 2) TO store: stock moves (positive) + inventory increment
                DB::table('stock_moves')->insert([
                    'store_id'   => $transfer->to_store_id,
                    'variant_id' => $line->variant_id,
                    'qty'        => $line->qty,
                    'type'       => 'receive',
                    'ref_id'     => $id,
                    'note'       => 'Transfer in',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                DB::statement("
                    INSERT INTO inventory_items (store_id, variant_id, qty_on_hand, created_at, updated_at)
                    VALUES (?, ?, ?, now(), now())
                    ON CONFLICT (store_id, variant_id)
                    DO UPDATE SET qty_on_hand = inventory_items.qty_on_hand + EXCLUDED.qty_on_hand
                ", [
                    $transfer->to_store_id,
                    $line->variant_id,
                    $line->qty,
                ]);
            }

            DB::table('transfers')->where('id', $id)->update([
                'status'     => 'received',
                'updated_at' => now(),
            ]);

            return ['ok' => true];
        });
    }

    public function cancel($id)
    {
        $transfer = DB::table('transfers')->where('id', $id)->first();
        if (! $transfer) {
            return response()->json(['error' => 'Transfer not found'], 404);
        }

        if (in_array($transfer->status, ['received', 'cancelled'])) {
            return response()->json(['error' => 'Cannot cancel this transfer'], 400);
        }

        DB::table('transfers')->where('id', $id)->update([
            'status'     => 'cancelled',
            'updated_at' => now(),
        ]);

        return ['ok' => true];
    }

    public function show($id)
    {
        $header = DB::table('transfers')->where('id', $id)->first();
        if (! $header) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $lines = DB::table('transfer_lines as l')
            ->join('product_variants as v', 'v.id', '=', 'l.variant_id')
            ->join('products as p', 'p.id', '=', 'v.product_id')
            ->select(
                'l.id',
                'l.qty',
                'v.sku',
                'p.name as product'
            )
            ->where('l.transfer_id', $id)
            ->get();

        return [
            'header' => $header,
            'lines'  => $lines,
        ];
    }
}
