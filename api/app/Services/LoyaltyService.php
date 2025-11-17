<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class LoyaltyService
{
    /**
     * 1 point per 1.00 of order total.
     */
    public function calculatePointsEarned(float $orderTotal): int
    {
        return (int) floor($orderTotal);
    }

    /**
     * Redeem points safely:
     * - cannot exceed customer's balance
     * - cannot exceed the amount available for discount
     *   (e.g. subtotal - coupon discount)
     */
    public function calculatePointsToRedeem(int $requested, int $balance, float $maxAmount): int
    {
        $requested = max(0, $requested);
        $allowedByBalance = min($requested, $balance);
        $allowedByAmount  = (int) floor(min($maxAmount, $allowedByBalance));

        return max(0, $allowedByAmount);
    }

    public function addTransaction(
        int $customerId,
        string $type,
        int $points,
        ?int $orderId = null,
        ?int $refundId = null,
        ?string $note = null
    ): void {
        DB::table('loyalty_transactions')->insert([
            'customer_id' => $customerId,
            'order_id'    => $orderId,
            'refund_id'   => $refundId,
            'type'        => $type,
            'points'      => $points,
            'note'        => $note,
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);
    }
}
