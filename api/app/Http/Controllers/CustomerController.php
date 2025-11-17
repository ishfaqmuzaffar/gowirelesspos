<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;

class CustomerController extends Controller
{
    public function show($id)
    {
        // Fetch customer
        $customer = DB::table('customers')->where('id', $id)->first();

        if (!$customer) {
            return response()->json(['error' => 'Customer not found'], 404);
        }

        // Fetch their orders
        $orders = DB::table('orders as o')
            ->leftJoin('payments as p', 'p.order_id', '=', 'o.id')
            ->select(
                'o.id',
                'o.created_at',
                'o.total',
                'o.coupon_code',
                'p.method as payment_method'
            )
            ->where('o.customer_id', $id)
            ->orderBy('o.created_at', 'desc')
            ->get();

        return [
            'customer' => $customer,
            'orders'   => $orders,
        ];
    }
}
