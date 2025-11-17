<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;

class ReceiptController extends Controller
{
    public function show($id)
    {
        // Order
        $order = DB::table('orders as o')
            ->leftJoin('customers as c', 'c.id', '=', 'o.customer_id')
            ->leftJoin('payments as p', 'p.order_id', '=', 'o.id')
            ->leftJoin('registers as r', 'r.id', '=', 'o.register_id')
            ->leftJoin('stores as s', 's.id', '=', 'o.store_id')
            ->select(
                'o.*',
                'c.name as customer_name',
                'c.phone as customer_phone',
                'c.email as customer_email',
                'c.address as customer_address',
                'p.method as payment_method',
                'r.name as register_name',
                's.name as store_name'
            )
            ->where('o.id', $id)
            ->first();

        if (!$order) {
            return response()->json(['error' => 'Order not found'], 404);
        }

        // Lines
        $lines = DB::table('order_lines')
            ->where('order_id', $id)
            ->get();

        return [
            'order' => $order,
            'lines' => $lines,
        ];
    }
}
