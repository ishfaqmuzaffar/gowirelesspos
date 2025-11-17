<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class SalesReportController extends Controller
{
    /**
     * JSON sales report:
     * - date_from, date_to (YYYY-MM-DD)
     * - store_id (optional)
     * - register_id (optional)
     * - group = null | store | register | product
     */
    public function index(Request $request)
    {
        $data = $this->buildSalesData($request);

        return response()->json($data);
    }

    /**
     * CSV export for sales report.
     * Same filters as index(), but returns a downloadable CSV file.
     */
    public function export(Request $request)
    {
        $data = $this->buildSalesData($request);

        $group   = $data['group'];         // null | store | register | product
        $rows    = $data['rows'] ?? [];
        $summary = $data['summary'];

        $filename = 'sales_' . now()->format('Ymd_His') . '.csv';

        $handle = fopen('php://temp', 'r+');

        if ($group === 'store') {
            fputcsv($handle, ['Store ID', 'Store', 'Orders', 'Gross Sales', 'Refunds', 'Net Sales']);
            foreach ($rows as $row) {
                fputcsv($handle, [
                    $row['store_id'],
                    $row['store_name'],
                    $row['orders_count'],
                    number_format($row['gross_sales'], 2, '.', ''),
                    number_format($row['refunds_total'], 2, '.', ''),
                    number_format($row['net_sales'], 2, '.', ''),
                ]);
            }
        } elseif ($group === 'register') {
            fputcsv($handle, ['Register ID', 'Register', 'Store ID', 'Store', 'Orders', 'Gross Sales', 'Refunds', 'Net Sales']);
            foreach ($rows as $row) {
                fputcsv($handle, [
                    $row['register_id'],
                    $row['register_name'],
                    $row['store_id'],
                    $row['store_name'],
                    $row['orders_count'],
                    number_format($row['gross_sales'], 2, '.', ''),
                    number_format($row['refunds_total'], 2, '.', ''),
                    number_format($row['net_sales'], 2, '.', ''),
                ]);
            }
        } elseif ($group === 'product') {
            fputcsv($handle, ['Variant ID', 'SKU', 'Product', 'Units', 'Gross Sales']);
            foreach ($rows as $row) {
                fputcsv($handle, [
                    $row['variant_id'],
                    $row['sku'],
                    $row['product_name'],
                    $row['units'],
                    number_format($row['gross_sales'], 2, '.', ''),
                ]);
            }
        } else {
            // No grouping: just summary line
            fputcsv($handle, ['Orders', 'Gross Sales', 'Refunds', 'Net Sales']);
            fputcsv($handle, [
                $summary['orders_count'],
                number_format($summary['gross_sales'], 2, '.', ''),
                number_format($summary['refunds_total'], 2, '.', ''),
                number_format($summary['net_sales'], 2, '.', ''),
            ]);
        }

        // Append blank line and summary at bottom for grouped reports
        if ($group !== null) {
            fputcsv($handle, []);
            fputcsv($handle, ['SUMMARY']);
            fputcsv($handle, ['Orders', 'Gross Sales', 'Refunds', 'Net Sales']);
            fputcsv($handle, [
                $summary['orders_count'],
                number_format($summary['gross_sales'], 2, '.', ''),
                number_format($summary['refunds_total'], 2, '.', ''),
                number_format($summary['net_sales'], 2, '.', ''),
            ]);
        }

        rewind($handle);
        $csv = stream_get_contents($handle);
        fclose($handle);

        return response($csv, 200, [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    /**
     * Core logic used by both JSON and CSV endpoints.
     */
    protected function buildSalesData(Request $request): array
    {
        $dateFrom   = $request->query('date_from');
        $dateTo     = $request->query('date_to');
        $storeId    = $request->query('store_id');
        $registerId = $request->query('register_id');
        $group      = $request->query('group'); // null | store | register | product

        // Defaults: today's date
        try {
            $from = $dateFrom
                ? Carbon::parse($dateFrom)->startOfDay()
                : now()->startOfDay();
        } catch (\Exception $e) {
            $from = now()->startOfDay();
        }

        try {
            $to = $dateTo
                ? Carbon::parse($dateTo)->endOfDay()
                : now()->endOfDay();
        } catch (\Exception $e) {
            $to = now()->endOfDay();
        }

        // Base orders query
        $ordersBase = DB::table('orders as o')
            ->whereBetween('o.created_at', [$from, $to])
            ->whereIn('o.status', ['completed', 'refunded']); // treat refunded as part of the day, but net out via refunded_total

        if ($storeId) {
            $ordersBase->where('o.store_id', (int) $storeId);
        }
        if ($registerId) {
            $ordersBase->where('o.register_id', (int) $registerId);
        }

        // Overall summary
        $summaryRow = (clone $ordersBase)
            ->selectRaw('
                COUNT(*) as orders_count,
                COALESCE(SUM(o.total), 0) as gross_sales,
                COALESCE(SUM(o.refunded_total), 0) as refunds_total
            ')
            ->first();

        $summary = [
            'orders_count'  => (int) ($summaryRow->orders_count ?? 0),
            'gross_sales'   => (float) ($summaryRow->gross_sales ?? 0),
            'refunds_total' => (float) ($summaryRow->refunds_total ?? 0),
        ];
        $summary['net_sales'] = $summary['gross_sales'] - $summary['refunds_total'];

        $rows = [];

        if ($group === 'store') {
            $rows = (clone $ordersBase)
                ->join('stores as s', 's.id', '=', 'o.store_id')
                ->groupBy('o.store_id', 's.name')
                ->selectRaw('
                    o.store_id,
                    s.name as store_name,
                    COUNT(*) as orders_count,
                    COALESCE(SUM(o.total), 0) as gross_sales,
                    COALESCE(SUM(o.refunded_total), 0) as refunds_total
                ')
                ->orderBy('s.name')
                ->get()
                ->map(function ($row) {
                    $gross   = (float) $row->gross_sales;
                    $refunds = (float) $row->refunds_total;
                    return [
                        'store_id'      => $row->store_id,
                        'store_name'    => $row->store_name,
                        'orders_count'  => (int) $row->orders_count,
                        'gross_sales'   => $gross,
                        'refunds_total' => $refunds,
                        'net_sales'     => $gross - $refunds,
                    ];
                })
                ->all();
        } elseif ($group === 'register') {
            $rows = (clone $ordersBase)
                ->join('registers as r', 'r.id', '=', 'o.register_id')
                ->join('stores as s', 's.id', '=', 'o.store_id')
                ->groupBy('o.register_id', 'r.name', 'o.store_id', 's.name')
                ->selectRaw('
                    o.register_id,
                    r.name as register_name,
                    o.store_id,
                    s.name as store_name,
                    COUNT(*) as orders_count,
                    COALESCE(SUM(o.total), 0) as gross_sales,
                    COALESCE(SUM(o.refunded_total), 0) as refunds_total
                ')
                ->orderBy('s.name')
                ->orderBy('r.name')
                ->get()
                ->map(function ($row) {
                    $gross   = (float) $row->gross_sales;
                    $refunds = (float) $row->refunds_total;
                    return [
                        'register_id'   => $row->register_id,
                        'register_name' => $row->register_name,
                        'store_id'      => $row->store_id,
                        'store_name'    => $row->store_name,
                        'orders_count'  => (int) $row->orders_count,
                        'gross_sales'   => $gross,
                        'refunds_total' => $refunds,
                        'net_sales'     => $gross - $refunds,
                    ];
                })
                ->all();
        } elseif ($group === 'product') {
            // Product-level gross sales (not yet net of refunds per line – can be enhanced later using refund_lines)
            $linesBase = DB::table('order_lines as l')
                ->join('orders as o', 'o.id', '=', 'l.order_id')
                ->join('product_variants as v', 'v.id', '=', 'l.variant_id')
                ->join('products as p', 'p.id', '=', 'v.product_id')
                ->whereBetween('o.created_at', [$from, $to])
                ->whereIn('o.status', ['completed', 'refunded']);

            if ($storeId) {
                $linesBase->where('o.store_id', (int) $storeId);
            }
            if ($registerId) {
                $linesBase->where('o.register_id', (int) $registerId);
            }

            $rows = $linesBase
                ->groupBy('l.variant_id', 'v.sku', 'p.name')
                ->selectRaw('
                    l.variant_id,
                    v.sku,
                    p.name as product_name,
                    COALESCE(SUM(l.qty), 0) as units,
                    COALESCE(SUM(l.total), 0) as gross_sales
                ')
                ->orderByDesc(DB::raw('COALESCE(SUM(l.total), 0)'))
                ->limit(500)
                ->get()
                ->map(function ($row) {
                    return [
                        'variant_id'  => $row->variant_id,
                        'sku'         => $row->sku,
                        'product_name'=> $row->product_name,
                        'units'       => (float) $row->units,
                        'gross_sales' => (float) $row->gross_sales,
                    ];
                })
                ->all();
        } else {
            // No grouped rows; only summary
            $rows = [];
            $group = null;
        }

        return [
            'date_from' => $from->toDateString(),
            'date_to'   => $to->toDateString(),
            'store_id'  => $storeId ? (int) $storeId : null,
            'register_id' => $registerId ? (int) $registerId : null,
            'group'     => $group,
            'summary'   => $summary,
            'rows'      => $rows,
        ];
    }
}
