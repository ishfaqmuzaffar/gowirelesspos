<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class HeldOrderController extends Controller
{
    /**
     * List held sales / quotes.
     * Filters: store_id, register_id, type, q (customer/search).
     */
    public function index(Request $request)
    {
        $storeId    = $request->query('store_id');
        $registerId = $request->query('register_id');
        $type       = $request->query('type'); // 'held' | 'quote'
        $q          = trim((string) $request->query('q', ''));

        $query = DB::table('held_orders')
            ->where('status', 'open')
            ->orderBy('created_at', 'desc')
            ->limit(100);

        if ($storeId) {
            $query->where('store_id', (int) $storeId);
        }
        if ($registerId) {
            $query->where('register_id', (int) $registerId);
        }
        if ($type) {
            $query->where('type', $type);
        }
        if ($q !== '') {
            $like = '%' . $q . '%';
            $query->where(function ($sub) use ($like) {
                $sub->where('customer_name', 'ILIKE', $like)
                    ->orWhere('customer_phone', 'ILIKE', $like)
                    ->orWhere('customer_email', 'ILIKE', $like);
            });
        }

        $rows = $query->get();

        return $rows->map(function ($row) {
            return [
                'id'              => $row->id,
                'store_id'        => $row->store_id,
                'register_id'     => $row->register_id,
                'type'            => $row->type,
                'status'          => $row->status,
                'customer_name'   => $row->customer_name,
                'customer_phone'  => $row->customer_phone,
                'customer_email'  => $row->customer_email,
                'total'           => (float) $row->total,
                'created_at'      => $row->created_at,
            ];
        });
    }

    /**
     * Store a held sale or quote.
     * Payload (similar to /orders):
     * {
     *   "type": "held" | "quote",
     *   "store_id": ...,
     *   "register_id": ...,
     *   "lines": [ { "variant_id": "...", "qty": 1 } ],
     *   "customer": { name, phone, email, address },
     *   "coupon_code": "...",
     *   "coupon_amount": 10.0
     * }
     */
    public function store(Request $request)
    {
        $user = Auth::user();

        $data = $request->validate([
            'type'         => ['required', 'string'], // 'held' | 'quote'
            'store_id'     => ['required', 'integer'],
            'register_id'  => ['nullable', 'integer'],
            'lines'        => ['required', 'array', 'min:1'],
            'lines.*.variant_id' => ['required', 'string'],
            'lines.*.qty'        => ['required', 'numeric', 'min:0.01'],
            'customer.name'      => ['nullable', 'string'],
            'customer.phone'     => ['nullable', 'string'],
            'customer.email'     => ['nullable', 'string'],
            'customer.address'   => ['nullable', 'string'],
            'coupon_code'        => ['nullable', 'string'],
            'coupon_amount'      => ['nullable', 'numeric'],
        ]);

        $variantIds = collect($data['lines'])->pluck('variant_id')->all();

        $variants = DB::table('product_variants as v')
            ->join('products as p', 'p.id', '=', 'v.product_id')
            ->whereIn('v.id', $variantIds)
            ->select('v.id', 'v.product_id', 'v.sku', 'v.price', 'v.attributes', 'p.name as product_name')
            ->get()
            ->keyBy('id');

        if (count($variants) !== count($variantIds)) {
            return response()->json(['error' => 'Some variants not found.'], 422);
        }

        $lines = [];
        $subtotal = 0;

        foreach ($data['lines'] as $lineInput) {
            $variant = $variants[$lineInput['variant_id']];
            $qty     = (float) $lineInput['qty'];
            $price   = (float) $variant->price;
            $lineTotal = $qty * $price;

            $attrs = $variant->attributes ? json_decode($variant->attributes, true) : null;

            $lines[] = [
                'variant_id'    => $variant->id,
                'product_id'    => $variant->product_id,
                'sku'           => $variant->sku,
                'name'          => $variant->product_name,
                'attributes'    => $attrs,
                'qty'           => $qty,
                'price'         => $price,
                'total'         => $lineTotal,
            ];

            $subtotal += $lineTotal;
        }

        $couponAmount = isset($data['coupon_amount']) ? (float) $data['coupon_amount'] : 0.0;
        $discountTotal = max(0, min($couponAmount, $subtotal));
        $taxTotal = 0.0; // placeholder if you later add tax logic
        $total = $subtotal - $discountTotal + $taxTotal;

        $customer = $data['customer'] ?? [];

        DB::beginTransaction();

        try {
            $heldId = DB::table('held_orders')->insertGetId([
                'store_id'         => $data['store_id'],
                'register_id'      => $data['register_id'] ?? null,
                'user_id'          => $user ? $user->id : null,
                'type'             => $data['type'],
                'customer_name'    => $customer['name'] ?? null,
                'customer_phone'   => $customer['phone'] ?? null,
                'customer_email'   => $customer['email'] ?? null,
                'customer_address' => $customer['address'] ?? null,
                'status'           => 'open',
                'subtotal'         => $subtotal,
                'discount_total'   => $discountTotal,
                'tax_total'        => $taxTotal,
                'total'            => $total,
                'coupon_code'      => $data['coupon_code'] ?? null,
                'coupon_amount'    => $discountTotal,
                'created_at'       => now(),
                'updated_at'       => now(),
            ]);

            foreach ($lines as $line) {
                DB::table('held_order_lines')->insert([
                    'held_order_id' => $heldId,
                    'product_id'    => $line['product_id'],
                    'variant_id'    => $line['variant_id'],
                    'sku'           => $line['sku'],
                    'name'          => $line['name'],
                    'attributes'    => $line['attributes'] ? json_encode($line['attributes']) : null,
                    'qty'           => $line['qty'],
                    'price'         => $line['price'],
                    'total'         => $line['total'],
                    'created_at'    => now(),
                    'updated_at'    => now(),
                ]);
            }

            DB::commit();

            return response()->json([
                'id'    => $heldId,
                'total' => $total,
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            report($e);
            return response()->json(['error' => 'Failed to hold sale.'], 500);
        }
    }

    /**
     * Get a held sale with lines, for restoring into Sell screen.
     */
    public function show($id)
    {
        $held = DB::table('held_orders')->where('id', $id)->first();
        if (! $held) {
            return response()->json(['error' => 'Held sale not found'], 404);
        }

        $lines = DB::table('held_order_lines')
            ->where('held_order_id', $id)
            ->get()
            ->map(function ($l) {
                return [
                    'id'         => $l->id,
                    'variant_id' => $l->variant_id,
                    'sku'        => $l->sku,
                    'name'       => $l->name,
                    'attributes' => $l->attributes ? json_decode($l->attributes, true) : null,
                    'qty'        => (float) $l->qty,
                    'price'      => (float) $l->price,
                    'total'      => (float) $l->total,
                ];
            });

        return [
            'held_order' => [
                'id'              => $held->id,
                'store_id'        => $held->store_id,
                'register_id'     => $held->register_id,
                'type'            => $held->type,
                'status'          => $held->status,
                'customer_name'   => $held->customer_name,
                'customer_phone'  => $held->customer_phone,
                'customer_email'  => $held->customer_email,
                'customer_address'=> $held->customer_address,
                'subtotal'        => (float) $held->subtotal,
                'discount_total'  => (float) $held->discount_total,
                'tax_total'       => (float) $held->tax_total,
                'total'           => (float) $held->total,
                'coupon_code'     => $held->coupon_code,
                'coupon_amount'   => (float) $held->coupon_amount,
                'created_at'      => $held->created_at,
            ],
            'lines' => $lines,
        ];
    }

    /**
     * Delete/cancel a held sale (after converting or user cancel).
     */
    public function destroy($id)
    {
        $exists = DB::table('held_orders')->where('id', $id)->exists();
        if (! $exists) {
            return response()->json(['error' => 'Held sale not found'], 404);
        }

        DB::table('held_order_lines')->where('held_order_id', $id)->delete();
        DB::table('held_orders')->where('id', $id)->delete();

        return response()->json(['ok' => true]);
    }

    /**
     * Mark a held sale as converted instead of hard-delete (optional).
     */
    public function markConverted($id)
    {
        $updated = DB::table('held_orders')
            ->where('id', $id)
            ->update([
                'status'     => 'converted',
                'updated_at' => now(),
            ]);

        if (! $updated) {
            return response()->json(['error' => 'Held sale not found'], 404);
        }

        return response()->json(['ok' => true]);
    }


   public function delete($id)
   {
    $row = DB::table('held_orders')->where('id', $id)->first();

    if (!$row) {
        return response()->json(['error' => 'Not found'], 404);
    }

    // delete lines first
    DB::table('held_order_lines')->where('held_order_id', $id)->delete();
    DB::table('held_orders')->where('id', $id)->delete();

    return ['success' => true];
   }

}
