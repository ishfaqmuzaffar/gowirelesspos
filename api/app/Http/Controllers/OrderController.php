<?php

namespace App\Http\Controllers;

use App\Services\LoyaltyService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'store_id'    => 'required|integer',
            'register_id' => 'nullable|integer',

            'lines'                 => 'required|array|min:1',
            'lines.*.variant_id'    => 'required|string',
            'lines.*.qty'           => 'required|numeric|min:0.001',

            'customer'              => 'nullable|array',
            'customer.name'         => 'nullable|string|max:255',
            'customer.phone'        => 'nullable|string|max:50',
            'customer.email'        => 'nullable|email|max:255',
            'customer.address'      => 'nullable|string|max:255',

            'payment_method'        => 'required|string|max:50',

            'coupon_code'           => 'nullable|string|max:100',
            'coupon_amount'         => 'nullable|numeric|min:0',

            // NEW: loyalty redeem points
            'loyalty_redeem_points' => 'nullable|integer|min:0',
        ]);

        return DB::transaction(function () use ($data) {
            $storeId    = (int) $data['store_id'];
            $registerId = $data['register_id'] ?? null;
            $userId     = auth()->id() ?? 1; // uses logged-in user, fallback 1

            $store = DB::table('stores')->where('id', $storeId)->first();
            if (!$store) {
                return response()->json(['error' => 'Store not found'], 422);
            }

            if ($registerId !== null) {
                $reg = DB::table('registers')
                    ->where('id', $registerId)
                    ->where('store_id', $storeId)
                    ->where('is_active', true)
                    ->first();

                if (!$reg) {
                    return response()->json(['error' => 'Invalid register for this store'], 422);
                }
            }

            $now        = now();
            $subtotal   = 0;
            $linesData  = [];
            $stockMoves = [];

            // ---------- Build lines & subtotal ----------
            foreach ($data['lines'] as $line) {
                $variantId = $line['variant_id'];
                $qty       = $line['qty'];

                $variant = DB::table('product_variants as v')
                    ->join('products as p', 'p.id', '=', 'v.product_id')
                    ->select('v.id', 'v.price', 'p.name')
                    ->where('v.id', $variantId)
                    ->first();

                if (!$variant) {
                    return response()->json(['error' => 'Variant not found: '.$variantId], 422);
                }

                $lineTotal = $variant->price * $qty;
                $subtotal  += $lineTotal;

                $linesData[] = [
                    'variant_id' => $variant->id,
                    'name'       => $variant->name,
                    'qty'        => $qty,
                    'price'      => $variant->price,
                    'discount'   => 0,
                    'tax'        => 0,
                    'total'      => $lineTotal,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }

            // ---------- Customer lookup / create ----------
            $customerId   = null;
            $customerName = null;

            if (!empty($data['customer'])) {
                $c = $data['customer'];
                $name    = $c['name']    ?? null;
                $phone   = $c['phone']   ?? null;
                $email   = $c['email']   ?? null;
                $address = $c['address'] ?? null;

                $existing = null;
                if ($email) {
                    $existing = DB::table('customers')->where('email', $email)->first();
                }
                if (!$existing && $phone) {
                    $existing = DB::table('customers')->where('phone', $phone)->first();
                }

                if ($existing) {
                    $customerId   = $existing->id;
                    $customerName = $existing->name;

                    DB::table('customers')->where('id', $existing->id)->update([
                        'name'       => $name    ?: $existing->name,
                        'phone'      => $phone   ?: $existing->phone,
                        'email'      => $email   ?: $existing->email,
                        'address'    => $address ?: $existing->address,
                        'updated_at' => $now,
                    ]);
                } elseif ($name || $phone || $email) {
                    $customerId = DB::table('customers')->insertGetId([
                        'name'       => $name ?: ($phone ?: ($email ?: 'Customer')),
                        'email'      => $email,
                        'phone'      => $phone,
                        'address'    => $address,
                        'price_tier' => 'retail',
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                    $customerName = $name ?: $phone ?: $email;
                }
            }

            // ---------- Discounts + Loyalty ----------
            $couponAmount = isset($data['coupon_amount']) ? (float) $data['coupon_amount'] : 0.0;
            if ($couponAmount < 0) $couponAmount = 0;
            if ($couponAmount > $subtotal) $couponAmount = $subtotal;

            $loyaltyRedeemRequested = isset($data['loyalty_redeem_points'])
                ? (int) $data['loyalty_redeem_points']
                : 0;

            $discountTotal        = 0.0;
            $taxTotal             = 0.0;
            $total                = 0.0;
            $loyaltyPointsEarned  = 0;
            $loyaltyPointsRedeemed= 0;

            if ($customerId) {
                // lock customer row so balance updates are safe
                $customerRow = DB::table('customers')
                    ->where('id', $customerId)
                    ->lockForUpdate()
                    ->first();

                $service        = app(LoyaltyService::class);
                $currentBalance = (int) ($customerRow->loyalty_points_balance ?? 0);
                $currentLifetime= (int) ($customerRow->loyalty_points_lifetime_earned ?? 0);

                // max amount we allow loyalty discount against: subtotal minus coupon
                $maxRedeemAmount = $subtotal - $couponAmount;
                if ($maxRedeemAmount < 0) {
                    $maxRedeemAmount = 0;
                }

                $pointsToRedeem = $service->calculatePointsToRedeem(
                    $loyaltyRedeemRequested,
                    $currentBalance,
                    $maxRedeemAmount
                );

                $loyaltyPointsRedeemed = $pointsToRedeem;
                $loyaltyDiscount       = (float) $pointsToRedeem;

                $discountTotal = $couponAmount + $loyaltyDiscount;
                if ($discountTotal > $subtotal) {
                    $discountTotal = $subtotal;
                }

                $taxTotal = 0.0; // if you add tax later, adjust here
                $total    = $subtotal - $discountTotal;

                // points earned on final total
                $loyaltyPointsEarned = $service->calculatePointsEarned($total);

                $newBalance = $currentBalance + $loyaltyPointsEarned - $loyaltyPointsRedeemed;
                $newLifetime = $currentLifetime + $loyaltyPointsEarned;

                DB::table('customers')
                    ->where('id', $customerId)
                    ->update([
                        'loyalty_points_balance'         => $newBalance,
                        'loyalty_points_lifetime_earned' => $newLifetime,
                        'updated_at'                     => $now,
                    ]);

                // log earn
                if ($loyaltyPointsEarned > 0) {
                    $service->addTransaction(
                        $customerId,
                        'earn',
                        $loyaltyPointsEarned,
                        null,
                        null,
                        'Points earned on order (will be linked after order insert)'
                    );
                }

                // log redeem (negative points)
                if ($loyaltyPointsRedeemed > 0) {
                    $service->addTransaction(
                        $customerId,
                        'redeem',
                        -$loyaltyPointsRedeemed,
                        null,
                        null,
                        'Points redeemed on order (will be linked after order insert)'
                    );
                }
            } else {
                // no customer => only coupon discount, no loyalty
                $discountTotal = $couponAmount;
                if ($discountTotal > $subtotal) {
                    $discountTotal = $subtotal;
                }
                $taxTotal = 0.0;
                $total    = $subtotal - $discountTotal;
            }

            // ---------- Insert order ----------
            $orderId = DB::table('orders')->insertGetId([
                'store_id'               => $storeId,
                'register_id'            => $registerId,
                'user_id'                => $userId,
                'customer_id'            => $customerId,
                'source'                 => 'POS',
                'status'                 => 'completed',
                'coupon_code'            => $data['coupon_code'] ?? null,
                'subtotal'               => $subtotal,
                'discount_total'         => $discountTotal,
                'tax_total'              => $taxTotal,
                'total'                  => $total,
                'refunded_total'         => 0,
                'refund_status'          => 'none',
                'loyalty_points_earned'  => $loyaltyPointsEarned,
                'loyalty_points_redeemed'=> $loyaltyPointsRedeemed,
                'created_at'             => $now,
                'updated_at'             => $now,
            ]);

            // back-fill order_id into the loyalty transactions we just inserted (where order_id is null)
            if ($customerId && ($loyaltyPointsEarned > 0 || $loyaltyPointsRedeemed > 0)) {
                DB::table('loyalty_transactions')
                    ->where('customer_id', $customerId)
                    ->whereNull('order_id')
                    ->where('created_at', '>=', $now->copy()->subSeconds(5)) // crude but works in this context
                    ->update(['order_id' => $orderId]);
            }

            // ---------- Order lines + inventory + stock moves ----------
            foreach ($linesData as $line) {
                $line['order_id'] = $orderId;
                DB::table('order_lines')->insert($line);

                $inv = DB::table('inventory_items')
                    ->where('store_id', $storeId)
                    ->where('variant_id', $line['variant_id'])
                    ->lockForUpdate()
                    ->first();

                if (!$inv) {
                    $invId = DB::table('inventory_items')->insertGetId([
                        'store_id'      => $storeId,
                        'variant_id'    => $line['variant_id'],
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
                        'qty_on_hand' => DB::raw('qty_on_hand - '.$line['qty']),
                        'updated_at'  => $now,
                    ]);

                $stockMoves[] = [
                    'store_id'   => $storeId,
                    'variant_id' => $line['variant_id'],
                    'qty'        => -$line['qty'],
                    'type'       => 'sale',
                    'ref_id'     => $orderId,
                    'note'       => 'POS sale',
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }

            if (!empty($stockMoves)) {
                DB::table('stock_moves')->insert($stockMoves);
            }

            // ---------- Payment ----------
            DB::table('payments')->insert([
                'order_id'   => $orderId,
                'method'     => $data['payment_method'],
                'amount'     => $total,
                'txn_ref'    => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            return [
                'order_id'              => $orderId,
                'subtotal'              => $subtotal,
                'discount'              => $discountTotal,
                'total'                 => $total,
                'customer_name'         => $customerName,
                'coupon_code'           => $data['coupon_code'] ?? null,
                'loyalty_earned'        => $loyaltyPointsEarned,
                'loyalty_redeemed'      => $loyaltyPointsRedeemed,
                'created_at'            => $now->toISOString(),
            ];
        });
    }
}
