<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;

use App\Http\Controllers\AuthController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\StockController;
use App\Http\Controllers\ReceivingController;
use App\Http\Controllers\ReportsController;
use App\Http\Controllers\WooSyncController;
use App\Http\Controllers\ProductAdminController;
use App\Http\Controllers\OrderHistoryController;
use App\Http\Controllers\TransferController;
use App\Http\Controllers\SuppliersController;
use App\Http\Controllers\UserAdminController;
use App\Http\Controllers\RefundController;
use App\Http\Controllers\AdminRegistrationController;
use App\Http\Controllers\RegisterSessionController;
use App\Http\Controllers\SalesReportController;
use App\Http\Controllers\HeldOrderController;
use App\Http\Controllers\LoyaltyController;


// Public health check
Route::get('/health', fn() => ['ok' => true, 'time' => now()->toISOString()]);

// -------- AUTH ----------
Route::post('/auth/login', [AuthController::class, 'login']);

// Auth "me" using token middleware
Route::get('/auth/me', [AuthController::class, 'me'])
    ->middleware(\App\Http\Middleware\AuthToken::class);

// -------- ADMIN REGISTRATION (PUBLIC, BUT GUARDED BY DB CHECK) ----------
Route::get('/admin/can-register', [AdminRegistrationController::class, 'canRegister']);
Route::post('/admin/register', [AdminRegistrationController::class, 'register']);

// -------- AUTHENTICATED API ----------
Route::middleware(\App\Http\Middleware\AuthToken::class)->group(function () {

    // ---------- STORES & REGISTERS ----------
    Route::get('/stores', function () {
        return DB::table('stores')
            ->select('id', 'name', 'code', 'address')
            ->orderBy('name')
            ->get();
    });

    Route::get('/registers', function (Request $request) {
        $storeId = $request->query('store_id');

        $q = DB::table('registers')
            ->where('is_active', true)
            ->orderBy('name');

        if ($storeId) {
            $q->where('store_id', (int) $storeId);
        }

        return $q->select('id', 'store_id', 'name', 'device_key')->get();
    });

    // ---------- REGISTER SESSIONS (CASH DRAWER) ----------
    Route::get('/registers/{registerId}/session', [RegisterSessionController::class, 'current']);
    Route::post('/registers/{registerId}/sessions/open', [RegisterSessionController::class, 'open']);
    Route::post('/registers/{registerId}/sessions/close', [RegisterSessionController::class, 'close']);
    Route::post('/registers/{registerId}/sessions/cash-move', [RegisterSessionController::class, 'cashMove']);

    // ---------- CUSTOMERS & HISTORY ----------
    Route::get('/customers', function (Request $request) {
        $search = trim((string) $request->query('q', ''));

        $q = DB::table('customers as c')
            ->leftJoin('orders as o', 'o.customer_id', '=', 'c.id')
            ->select(
                'c.id',
                'c.name',
                'c.phone',
                'c.email',
                'c.address',
                DB::raw('MAX(o.created_at) as last_order_at'),
                DB::raw('COUNT(o.id) as orders_count'),
                DB::raw('COALESCE(SUM(o.total), 0) as total_spent')
            )
            ->groupBy('c.id', 'c.name', 'c.phone', 'c.email', 'c.address')
            ->orderByDesc('last_order_at');

        if ($search !== '') {
            $q->where(function ($sub) use ($search) {
                $like = '%' . $search . '%';
                $sub->where('c.name', 'ILIKE', $like)
                    ->orWhere('c.phone', 'ILIKE', $like)
                    ->orWhere('c.email', 'ILIKE', $like);
            });
        }

        $rows = $q->limit(50)->get();

        return $rows->map(function ($row) {
            return [
                'id'            => $row->id,
                'name'          => $row->name,
                'phone'         => $row->phone,
                'email'         => $row->email,
                'address'       => $row->address,
                'last_order_at' => $row->last_order_at,
                'orders_count'  => (int) $row->orders_count,
                'total_spent'   => (float) $row->total_spent,
            ];
        });
    });

    Route::get('/customers/{id}/orders', function (int $id) {
        $customer = DB::table('customers')->where('id', $id)->first();
        if (!$customer) {
            return response()->json(['error' => 'Customer not found'], 404);
        }

        $orders = DB::table('orders as o')
            ->leftJoin('stores as s', 's.id', '=', 'o.store_id')
            ->leftJoin('registers as r', 'r.id', '=', 'o.register_id')
            ->where('o.customer_id', $id)
            ->orderBy('o.created_at', 'desc')
            ->select(
                'o.id',
                'o.created_at',
                'o.total',
                'o.coupon_code',
                's.name as store_name',
                'r.name as register_name'
            )
            ->limit(50)
            ->get();

        if ($orders->isEmpty()) {
            return [
                'customer' => [
                    'id'      => $customer->id,
                    'name'    => $customer->name,
                    'phone'   => $customer->phone,
                    'email'   => $customer->email,
                    'address' => $customer->address,
                ],
                'orders' => [],
            ];
        }

        $orderIds = $orders->pluck('id')->all();

        $lines = DB::table('order_lines')
            ->whereIn('order_id', $orderIds)
            ->select('id', 'order_id', 'name', 'qty', 'total')
            ->get();

        $payments = DB::table('payments')
            ->whereIn('order_id', $orderIds)
            ->select('order_id', 'method', 'amount')
            ->get();

        $linesByOrder = [];
        foreach ($lines as $line) {
            $linesByOrder[$line->order_id][] = [
                'id'    => $line->id,
                'name'  => $line->name,
                'qty'   => (float) $line->qty,
                'total' => (float) $line->total,
            ];
        }

        $paymentByOrder = [];
        foreach ($payments as $p) {
            if (!isset($paymentByOrder[$p->order_id])) {
                $paymentByOrder[$p->order_id] = [
                    'method' => $p->method,
                    'amount' => (float) $p->amount,
                ];
            }
        }

        $ordersOut = $orders->map(function ($o) use ($linesByOrder, $paymentByOrder) {
            $pay = $paymentByOrder[$o->id] ?? null;
            return [
                'id'            => $o->id,
                'created_at'    => $o->created_at,
                'total'         => (float) $o->total,
                'coupon_code'   => $o->coupon_code,
                'store_name'    => $o->store_name,
                'register_name' => $o->register_name,
                'payment'       => $pay,
                'lines'         => $linesByOrder[$o->id] ?? [],
            ];
        });

        return [
            'customer' => [
                'id'      => $customer->id,
                'name'    => $customer->name,
                'phone'   => $customer->phone,
                'email'   => $customer->email,
                'address' => $customer->address,
            ],
            'orders' => $ordersOut,
        ];
    });

    // ---------- DASHBOARD SUMMARY ----------
    Route::get('/dashboard/summary', function () {
        $now       = now();
        $today     = $now->copy()->startOfDay();
        $weekStart = $now->copy()->subDays(6)->startOfDay();

        $salesRows = DB::table('orders as o')
            ->where('o.status', 'completed')
            ->where('o.created_at', '>=', $weekStart)
            ->select(
                DB::raw("DATE(o.created_at) as day"),
                DB::raw("COUNT(*) as orders_count"),
                DB::raw("SUM(o.total) as total_amount")
            )
            ->groupBy(DB::raw("DATE(o.created_at)"))
            ->orderBy('day')
            ->get();

        $salesByDay = [];
        $todayTotal = 0;
        $todayOrders = 0;
        $weekTotal = 0;
        $weekOrders = 0;

        foreach ($salesRows as $row) {
            $dayStr = (string) $row->day;
            $total  = (float) $row->total_amount;
            $orders = (int) $row->orders_count;

            $salesByDay[] = [
                'day'    => $dayStr,
                'total'  => $total,
                'orders' => $orders,
            ];

            $weekTotal  += $total;
            $weekOrders += $orders;

            if ($dayStr === $today->toDateString()) {
                $todayTotal  = $total;
                $todayOrders = $orders;
            }
        }

        $bestRows = DB::table('order_lines as l')
            ->join('orders as o', 'o.id', '=', 'l.order_id')
            ->join('product_variants as v', 'v.id', '=', 'l.variant_id')
            ->join('products as p', 'p.id', '=', 'v.product_id')
            ->where('o.status', 'completed')
            ->where('o.created_at', '>=', $now->copy()->subDays(30)->startOfDay())
            ->select(
                'v.sku',
                'p.name as product_name',
                DB::raw('SUM(l.qty) as units'),
                DB::raw('SUM(l.total) as revenue')
            )
            ->groupBy('v.sku', 'p.name')
            ->orderByDesc(DB::raw('SUM(l.qty)'))
            ->limit(5)
            ->get();

        $bestSellers = $bestRows->map(function ($row) {
            return [
                'sku'      => $row->sku,
                'product'  => $row->product_name,
                'units'    => (float) $row->units,
                'revenue'  => (float) $row->revenue,
            ];
        });

        $latestCustomers = DB::table('customers as c')
            ->leftJoin('orders as o', 'o.customer_id', '=', 'c.id')
            ->select(
                'c.id',
                'c.name',
                'c.phone',
                'c.email',
                DB::raw('MAX(o.created_at) as last_order_at'),
                DB::raw('COUNT(o.id) as orders_count'),
                DB::raw('COALESCE(SUM(o.total), 0) as total_spent')
            )
            ->groupBy('c.id', 'c.name', 'c.phone', 'c.email')
            ->orderByDesc('last_order_at')
            ->limit(5)
            ->get()
            ->map(function ($row) {
                return [
                    'id'            => $row->id,
                    'name'          => $row->name,
                    'phone'         => $row->phone,
                    'email'         => $row->email,
                    'last_order_at' => $row->last_order_at,
                    'orders_count'  => (int) $row->orders_count,
                    'total_spent'   => (float) $row->total_spent,
                ];
            });

        return [
            'summary' => [
                'today' => [
                    'total'  => $todayTotal,
                    'orders' => $todayOrders,
                ],
                'week' => [
                    'total'  => $weekTotal,
                    'orders' => $weekOrders,
                ],
            ],
            'sales_by_day'     => $salesByDay,
            'best_sellers'     => $bestSellers,
            'latest_customers' => $latestCustomers,
        ];
    });

    // ---------- PUBLIC PRODUCTS (for Sell screen) ----------
    Route::get('/products', function () {
        $rows = DB::table('product_variants as v')
            ->join('products as p', 'p.id', '=', 'v.product_id')
            ->select('v.id', 'v.sku', 'v.barcode', 'v.price', 'v.attributes', 'p.name as product_name')
            ->orderBy('v.updated_at', 'desc')
            ->limit(500)
            ->get();

        return $rows->map(function ($x) {
            $attrs = $x->attributes ? json_decode($x->attributes, true) : null;
            return [
                'id'         => $x->id,
                'sku'        => $x->sku,
                'barcode'    => $x->barcode,
                'price'      => $x->price,
                'product'    => ['name' => $x->product_name],
                'attributes' => $attrs,
            ];
        });
    });

    // ---------- ADMIN PRODUCTS ----------
    Route::get('/admin/products', [ProductAdminController::class, 'index']);
    Route::post('/admin/products', [ProductAdminController::class, 'store']);
    Route::put('/admin/products/{id}', [ProductAdminController::class, 'update']);

    Route::post('/admin/products/{id}/variants', [ProductAdminController::class, 'addVariant']);
    Route::put('/admin/variants/{id}', [ProductAdminController::class, 'updateVariant']);
    Route::delete('/admin/variants/{id}', [ProductAdminController::class, 'deleteVariant']);

    // ---------- ADMIN USERS ----------
    Route::get('/admin/users', [UserAdminController::class, 'index']);
    Route::post('/admin/users', [UserAdminController::class, 'store']);

    // ---------- SUPPLIERS ----------
    Route::get('/suppliers', [SuppliersController::class, 'index']);
    Route::post('/suppliers', [SuppliersController::class, 'store']);
    Route::get('/suppliers/{id}', [SuppliersController::class, 'show']);
    Route::put('/suppliers/{id}', [SuppliersController::class, 'update']);

    // ---------- ORDERS ----------
    Route::post('/orders', [OrderController::class, 'store']);
    Route::get('/orders', [OrderHistoryController::class, 'index']);
    Route::get('/orders/{id}', [OrderHistoryController::class, 'show']);

    // ---------- STOCK ----------
    Route::get('/stock', [StockController::class, 'index']);
    Route::post('/stock/adjust', [StockController::class, 'adjust']);
    Route::post('/stock/transfer', [StockController::class, 'transfer']);

    // ---------- RECEIVING ----------
    Route::post('/receiving/po', [ReceivingController::class, 'createPo']);
    Route::post('/receiving/receive', [ReceivingController::class, 'receive']);

    // ---------- REPORTS ----------
    Route::get('/reports/low-stock', [ReportsController::class, 'lowStock']);
    Route::get('/reports/top-sellers', [ReportsController::class, 'topSellers']);

    // NEW: SALES REPORTS
    Route::get('/reports/sales', [SalesReportController::class, 'index']);
    Route::get('/reports/sales/export', [SalesReportController::class, 'export']);

    // ---------- TRANSFERS ----------
    Route::get('/transfers', [TransferController::class, 'index']);
    Route::post('/transfers', [TransferController::class, 'store']);
    Route::post('/transfers/{id}/lines', [TransferController::class, 'addLine']);
    Route::post('/transfers/{id}/send', [TransferController::class, 'send']);
    Route::post('/transfers/{id}/receive', [TransferController::class, 'receive']);
    Route::post('/transfers/{id}/cancel', [TransferController::class, 'cancel']);
    Route::get('/transfers/{id}', [TransferController::class, 'show']);


    // ---------- HELD SALES / QUOTES ----------
    Route::get('/held-orders', [HeldOrderController::class, 'index']);
    Route::post('/held-orders', [HeldOrderController::class, 'store']);
    Route::get('/held-orders/{id}', [HeldOrderController::class, 'show']);
    Route::delete('/held-orders/{id}', [HeldOrderController::class, 'destroy']);
    Route::post('/held-orders/{id}/converted', [HeldOrderController::class, 'markConverted']);
    Route::delete('/held-orders/{id}', [HeldOrderController::class, 'delete']);


    // ---------- REFUNDS ----------
    Route::get('/orders/{order}/refunds', [RefundController::class, 'index']);
    Route::post('/orders/{order}/refunds', [RefundController::class, 'store']);
    Route::get('/refunds/{refund}', [RefundController::class, 'show']);


    // ---------- LOYALTY ----------
    Route::get('/loyalty/lookup', [LoyaltyController::class, 'lookup']);

    // ---------- WOO SYNC ----------
    Route::post('/woo/sync-products', [WooSyncController::class, 'syncProducts']);

});
