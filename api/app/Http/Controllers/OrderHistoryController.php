<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderHistoryController extends Controller
{
    /**
     * GET /api/orders?store_id=&days=&q=
     * List recent orders (for history screen).
     */
    public function index(Request $request)
    {
        $storeId = $request->query('store_id');
        $days    = (int) $request->query('days', 30);
        $q       = trim((string) $request->query('q', ''));

        $query = DB::table('orders as o')
            ->leftJoin('customers as c', 'c.id', '=', 'o.customer_id')
            ->select(
                'o.id',
                'o.store_id',
                'o.created_at',
                'o.total',
                'o.status',
                'o.source',
                'o.refunded_total',
                'o.refund_status',
                'c.name as customer_name'
            )
            ->orderBy('o.created_at', 'desc')
            ->limit(200);

        if ($storeId) {
            $query->where('o.store_id', (int) $storeId);
        }

        if ($days > 0) {
            $query->where('o.created_at', '>=', now()->subDays($days));
        }

        if ($q !== '') {
            $like = '%' . $q . '%';

            // simplify search: by customer name
            $query->where(function ($sub) use ($like) {
                $sub->where('c.name', 'ILIKE', $like);
            });
        }

        $orders = $query->get();

        if ($orders->isEmpty()) {
            return [];
        }

        $orderIds = $orders->pluck('id')->all();

        // One payment method per order (first payment)
        $payments = DB::table('payments')
            ->whereIn('order_id', $orderIds)
            ->orderBy('id')
            ->get();

        $methodByOrder = [];
        foreach ($payments as $p) {
            if (!isset($methodByOrder[$p->order_id])) {
                $methodByOrder[$p->order_id] = $p->method;
            }
        }

        return $orders->map(function ($o) use ($methodByOrder) {
            return [
                'id'             => $o->id,
                'store_id'       => $o->store_id,
                'created_at'     => $o->created_at,
                'total'          => (float) $o->total,
                'status'         => $o->status,
                'source'         => $o->source,
                'customer_name'  => $o->customer_name,
                'payment_method' => $methodByOrder[$o->id] ?? null,
                'refunded_total' => $o->refunded_total !== null ? (float) $o->refunded_total : 0.0,
                'refund_status'  => $o->refund_status,
            ];
        });
    }

    /**
     * GET /api/orders/{id}
     * Detailed order view (for drill-in + receipt).
     */
    public function show(int $id)
    {
        $order = DB::table('orders as o')
            ->leftJoin('stores as s', 's.id', '=', 'o.store_id')
            ->leftJoin('customers as c', 'c.id', '=', 'o.customer_id')
            ->leftJoin('users as u', 'u.id', '=', 'o.user_id')
            ->select(
                'o.id',
                'o.store_id',
                'o.created_at',
                'o.status',
                'o.source',
                'o.subtotal',
                'o.discount_total',
                'o.tax_total',
                'o.total',
                'o.refunded_total',
                'o.refund_status',
                's.name as store_name',
                's.address as store_address',
                'c.name as customer_name',
                'c.email as customer_email',
                'c.phone as customer_phone',
                'u.name as user_name'
            )
            ->where('o.id', $id)
            ->first();

        if (!$order) {
            return response()->json(['error' => 'Order not found'], 404);
        }

        // refunded qty per variant for this order
        $refunded = DB::table('refund_lines as rl')
            ->join('refunds as r', 'rl.refund_id', '=', 'r.id')
            ->where('r.order_id', $id)
            ->groupBy('rl.variant_id')
            ->select('rl.variant_id', DB::raw('SUM(rl.qty) as refunded_qty'))
            ->get();

        $refundedByVariant = [];
        foreach ($refunded as $row) {
            $refundedByVariant[$row->variant_id] = (float) $row->refunded_qty;
        }

        $lines = DB::table('order_lines as l')
            ->leftJoin('product_variants as v', 'v.id', '=', 'l.variant_id')
            ->leftJoin('products as p', 'p.id', '=', 'v.product_id')
            ->select(
                'l.id',
                'l.variant_id',
                'l.qty',
                'l.price',
                'l.discount',
                'l.tax',
                'l.total',
                'l.name as line_name',
                'v.sku',
                'v.attributes',
                'p.name as product_name'
            )
            ->where('l.order_id', $id)
            ->orderBy('l.id')
            ->get()
            ->map(function ($l) use ($refundedByVariant) {
                $attrs = $l->attributes ? json_decode($l->attributes, true) : null;
                $attrText = '';
                if (is_array($attrs)) {
                    $parts = [];
                    if (!empty($attrs['storage'])) $parts[] = $attrs['storage'];
                    if (!empty($attrs['color']))   $parts[] = $attrs['color'];
                    if (!empty($attrs['size']))    $parts[] = $attrs['size'];
                    $attrText = implode(' / ', $parts);
                }

                $soldQty      = (float) $l->qty;
                $refundedQty  = $refundedByVariant[$l->variant_id] ?? 0.0;
                $remainingQty = max($soldQty - $refundedQty, 0);

                return [
                    'id'            => $l->id,
                    'name'          => $l->line_name ?? $l->product_name,
                    'sku'           => $l->sku,
                    'attributes'    => $attrText,
                    'qty'           => $soldQty,
                    'price'         => (float) $l->price,
                    'discount'      => (float) $l->discount,
                    'tax'           => (float) $l->tax,
                    'total'         => (float) $l->total,
                    'refunded_qty'  => $refundedQty,
                    'remaining_qty' => $remainingQty,
                ];
            });

        $payments = DB::table('payments')
            ->where('order_id', $id)
            ->orderBy('id')
            ->get()
            ->map(function ($p) {
                return [
                    'id'      => $p->id,
                    'method'  => $p->method,
                    'amount'  => (float) $p->amount,
                    'txn_ref' => $p->txn_ref,
                ];
            });

        return [
            'id'             => $order->id,
            'store'          => [
                'id'      => $order->store_id,
                'name'    => $order->store_name,
                'address' => $order->store_address,
            ],
            'created_at'     => $order->created_at,
            'status'         => $order->status,
            'source'         => $order->source,
            'totals'         => [
                'subtotal'       => (float) $order->subtotal,
                'discount_total' => (float) $order->discount_total,
                'tax_total'      => (float) $order->tax_total,
                'total'          => (float) $order->total,
            ],
            'customer'       => [
                'name'  => $order->customer_name,
                'email' => $order->customer_email,
                'phone' => $order->customer_phone,
            ],
            'user'           => [
                'name' => $order->user_name,
            ],
            'refunded_total' => $order->refunded_total !== null ? (float) $order->refunded_total : 0.0,
            'refund_status'  => $order->refund_status,
            'lines'          => $lines,
            'payments'       => $payments,
        ];
    }
}
