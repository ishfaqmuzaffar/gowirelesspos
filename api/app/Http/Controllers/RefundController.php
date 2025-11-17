<?php

namespace App\Http\Controllers;

use App\Services\LoyaltyService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class RefundController extends Controller
{
    /**
     * Optional: list refunds for an order.
     */
    public function index($orderId)
    {
        $refunds = DB::table('refunds as r')
            ->leftJoin('stores as s', 's.id', '=', 'r.store_id')
            ->leftJoin('users as u', 'u.id', '=', 'r.user_id')
            ->where('r.order_id', $orderId)
            ->select(
                'r.*',
                's.name as store_name',
                'u.name as user_name'
            )
            ->orderBy('r.created_at', 'desc')
            ->get();

        return response()->json([
            'data' => $refunds,
        ]);
    }

    /**
     * Optional: show single refund.
     */
    public function show($refundId)
    {
        $refund = DB::table('refunds as r')
            ->leftJoin('stores as s', 's.id', '=', 'r.store_id')
            ->leftJoin('users as u', 'u.id', '=', 'r.user_id')
            ->where('r.id', $refundId)
            ->select(
                'r.*',
                's.name as store_name',
                'u.name as user_name'
            )
            ->first();

        if (!$refund) {
            return response()->json(['message' => 'Refund not found'], 404);
        }

        $lines = DB::table('refund_lines')
            ->where('refund_id', $refundId)
            ->get();

        $payments = DB::table('refund_payments')
            ->where('refund_id', $refundId)
            ->get();

        return response()->json([
            'data' => [
                'refund'   => $refund,
                'lines'    => $lines,
                'payments' => $payments,
            ],
        ]);
    }

    /**
     * POST /api/orders/{orderId}/refunds
     * Create a refund for an order.
     */
    public function store(Request $request, $orderId)
    {
        // 0. Load order
        $order = DB::table('orders')->where('id', $orderId)->first();
        if (!$order) {
            return response()->json([
                'message' => 'Order not found.',
            ], 404);
        }

        $data = $request->validate([
            'lines'                 => ['required', 'array', 'min:1'],
            'lines.*.line_id'       => ['required', 'integer', 'exists:order_lines,id'],
            'lines.*.qty'           => ['required', 'numeric', 'min:0.001'],
            'lines.*.price'         => ['required', 'numeric', 'min:0'],

            'return_to_inventory'   => ['required', 'boolean'],
            'notes'                 => ['nullable', 'string'],

            'payments'              => ['required', 'array', 'min:1'],
            'payments.*.method'     => ['required', 'string', 'max:50'],
            'payments.*.amount'     => ['required', 'numeric', 'min:0.01'],
        ]);

        // 1. Load original order lines (with variant + product)
        $originalLines = DB::table('order_lines as ol')
            ->join('product_variants as pv', 'ol.variant_id', '=', 'pv.id')
            ->where('ol.order_id', $order->id)
            ->select(
                'ol.id',
                'ol.variant_id',
                'ol.qty',
                'pv.product_id'
            )
            ->get()
            ->keyBy('id');

        if ($originalLines->isEmpty()) {
            return response()->json([
                'message' => 'No order lines found for this order.',
            ], 422);
        }

        // 2. Validate quantities: cannot exceed sold - already refunded
        foreach ($data['lines'] as $line) {
            $lineId       = (int) $line['line_id'];
            $qtyRequested = (float) $line['qty'];

            $matching = $originalLines->get($lineId);

            if (!$matching) {
                return response()->json([
                    'message' => 'Invalid line selected for refund. It does not belong to this order.',
                ], 422);
            }

            $variantId = $matching->variant_id;
            $soldQty   = (float) $matching->qty;

            $alreadyRefundedQty = DB::table('refund_lines as rl')
                ->join('refunds as r', 'rl.refund_id', '=', 'r.id')
                ->where('r.order_id', $order->id)
                ->where('rl.variant_id', $variantId)
                ->sum('rl.qty');

            $alreadyRefundedQty = (float) $alreadyRefundedQty;
            $maxRemaining       = $soldQty - $alreadyRefundedQty;

            if ($maxRemaining <= 0) {
                return response()->json([
                    'message' => 'This item has already been fully refunded.',
                ], 422);
            }

            if ($qtyRequested > $maxRemaining + 0.00001) {
                return response()->json([
                    'message' => 'Refund quantity cannot be greater than the remaining sold quantity for an item.',
                ], 422);
            }
        }

        // 3. Compute totals
        $lineTotals  = [];
        $refundTotal = 0.0;

        foreach ($data['lines'] as $line) {
            $lineTotal    = (float) $line['price'] * (float) $line['qty'];
            $lineTotals[] = $lineTotal;
            $refundTotal += $lineTotal;
        }

        $paymentsTotal = 0.0;
        foreach ($data['payments'] as $payment) {
            $paymentsTotal += (float) $payment['amount'];
        }

        if (round($paymentsTotal, 2) !== round($refundTotal, 2)) {
            return response()->json([
                'message' => 'Payments total must equal refund total.',
            ], 422);
        }

        // 4. Check against order total
        $orderTotal      = isset($order->total) ? (float) $order->total : null;
        $currentRefunded = (float) ($order->refunded_total ?? 0);

        if ($orderTotal !== null) {
            if ($currentRefunded + $refundTotal - 0.01 > $orderTotal) {
                return response()->json([
                    'message' => 'Refund amount exceeds order total.',
                ], 422);
            }
        }

        $user    = Auth::user();
        $storeId = $order->store_id ?? null;

        try {
            DB::beginTransaction();

            // 5. Create refund record
            $refundId = DB::table('refunds')->insertGetId([
                'order_id'            => $order->id,
                'store_id'            => $storeId,
                'user_id'             => $user ? $user->id : null,
                'total_amount'        => $refundTotal,
                'return_to_inventory' => $data['return_to_inventory'],
                'notes'               => $data['notes'] ?? null,
                'created_at'          => now(),
                'updated_at'          => now(),
            ]);

            // 6. Refund lines + inventory + stock_moves
            foreach ($data['lines'] as $index => $line) {
                $lineTotal = $lineTotals[$index];
                $lineId    = (int) $line['line_id'];

                $matching     = $originalLines->get($lineId);
                $productId    = $matching->product_id;
                $variantId    = $matching->variant_id;
                $qtyToRefund  = (float) $line['qty'];

                // Create refund line
                DB::table('refund_lines')->insert([
                    'refund_id'  => $refundId,
                    'product_id' => $productId,
                    'variant_id' => $variantId,
                    'qty'        => $qtyToRefund,
                    'price'      => (float) $line['price'],
                    'total'      => $lineTotal,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                // ✅ Return to inventory
                if ($storeId && $data['return_to_inventory']) {
                    // lock inventory row
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
                            'created_at'    => now(),
                            'updated_at'    => now(),
                        ]);
                        $inv = DB::table('inventory_items')->where('id', $invId)->first();
                    }

                    // increase stock
                    DB::table('inventory_items')
                        ->where('id', $inv->id)
                        ->update([
                            'qty_on_hand' => DB::raw('qty_on_hand + '.$qtyToRefund),
                            'updated_at'  => now(),
                        ]);

                    // stock move
                    DB::table('stock_moves')->insert([
                        'store_id'   => $storeId,
                        'variant_id' => $variantId,
                        'qty'        => $qtyToRefund,
                        'type'       => 'return',
                        'ref_id'     => $refundId,
                        'note'       => 'Refund #'.$refundId,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            // 7. Refund payments
            foreach ($data['payments'] as $payment) {
                DB::table('refund_payments')->insert([
                    'refund_id'  => $refundId,
                    'method'     => $payment['method'],
                    'amount'     => (float) $payment['amount'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            // 8. Update order refund totals / status
            if (
                Schema::hasColumn('orders', 'refunded_total') &&
                Schema::hasColumn('orders', 'refund_status')
            ) {
                $newRefunded = $currentRefunded + $refundTotal;

                $update = [
                    'refunded_total' => $newRefunded,
                    'updated_at'     => now(),
                ];

                if ($orderTotal !== null && $newRefunded >= $orderTotal - 0.01) {
                    // fully refunded
                    $update['refund_status'] = 'full';
                    if (Schema::hasColumn('orders', 'status')) {
                        $update['status'] = 'refunded';
                    }
                } else {
                    // partial refund
                    $update['refund_status'] = 'partial';
                }

                DB::table('orders')->where('id', $order->id)->update($update);
            }

            // 9. Loyalty adjustments (earn/remove and redeem give-back)
            if (!empty($order->customer_id)) {
                $customerId = (int) $order->customer_id;

                $customer = DB::table('customers')
                    ->where('id', $customerId)
                    ->lockForUpdate()
                    ->first();

                if ($customer) {
                    $service = app(LoyaltyService::class);

                    $orderTotalVal        = (float) ($order->total ?? 0);
                    $orderPointsEarned    = (int) ($order->loyalty_points_earned ?? 0);
                    $orderPointsRedeemed  = (int) ($order->loyalty_points_redeemed ?? 0);

                    $refundFraction = $orderTotalVal > 0
                        ? min(1.0, max(0.0, $refundTotal / $orderTotalVal))
                        : 0.0;

                    // remove earned points on the refunded portion
                    $pointsEarnedToRemove = (int) floor($orderPointsEarned * $refundFraction);

                    // give back some redeemed points on the refunded portion
                    $pointsRedeemBack = (int) floor($orderPointsRedeemed * $refundFraction);

                    $balance = (int) ($customer->loyalty_points_balance ?? 0);
                    $newBalance = $balance - $pointsEarnedToRemove + $pointsRedeemBack;

                    DB::table('customers')
                        ->where('id', $customerId)
                        ->update([
                            'loyalty_points_balance' => $newBalance,
                            'updated_at'             => now(),
                        ]);

                    if ($pointsEarnedToRemove > 0) {
                        $service->addTransaction(
                            $customerId,
                            'refund_adjust',
                            -$pointsEarnedToRemove,
                            $order->id,
                            $refundId,
                            'Remove earned points on refund'
                        );
                    }

                    if ($pointsRedeemBack > 0) {
                        $service->addTransaction(
                            $customerId,
                            'refund_adjust',
                            $pointsRedeemBack,
                            $order->id,
                            $refundId,
                            'Return redeemed points on refund'
                        );
                    }
                }
            }

            DB::commit();

            $refund = DB::table('refunds')->where('id', $refundId)->first();

            return response()->json([
                'data' => $refund,
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Failed to create refund.',
                'error'   => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }
}
