<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SuppliersController extends Controller
{
    /**
     * GET /api/suppliers
     * Optional search: ?q=...
     */
    public function index(Request $request)
    {
        $q = trim((string) $request->query('q', ''));

        $query = DB::table('suppliers')
            ->orderBy('name');

        if ($q !== '') {
            $like = '%'.$q.'%';
            $query->where(function ($sub) use ($like) {
                $sub->where('name', 'ILIKE', $like)
                    ->orWhere('contact_name', 'ILIKE', $like)
                    ->orWhere('phone', 'ILIKE', $like)
                    ->orWhere('email', 'ILIKE', $like)
                    ->orWhere('city', 'ILIKE', $like);
            });
        }

        $rows = $query->get();

        return $rows->map(function ($row) {
            return [
                'id'           => $row->id,
                'name'         => $row->name,
                'contact_name' => $row->contact_name,
                'phone'        => $row->phone,
                'email'        => $row->email,
                'city'         => $row->city,
                'address'      => $row->address,
                'notes'        => $row->notes,
                'active'       => (bool) $row->active,
                'created_at'   => $row->created_at,
            ];
        });
    }

    /**
     * GET /api/suppliers/{id}
     * Basic details.
     */
    public function show(int $id)
    {
        $row = DB::table('suppliers')->where('id', $id)->first();

        if (!$row) {
            return response()->json(['error' => 'Supplier not found'], 404);
        }

        return [
            'id'           => $row->id,
            'name'         => $row->name,
            'contact_name' => $row->contact_name,
            'phone'        => $row->phone,
            'email'        => $row->email,
            'city'         => $row->city,
            'address'      => $row->address,
            'notes'        => $row->notes,
            'active'       => (bool) $row->active,
            'created_at'   => $row->created_at,
        ];
    }

    /**
     * GET /api/suppliers/{id}/activity
     * POs + basic stats + received items (from stock_moves).
     */
    public function activity(int $id)
    {
        $supplier = DB::table('suppliers')->where('id', $id)->first();
        if (!$supplier) {
            return response()->json(['error' => 'Supplier not found'], 404);
        }

        // Purchase orders for this supplier
        $poQuery = DB::table('purchase_orders as po')
            ->leftJoin('stores as s', 's.id', '=', 'po.store_id')
            ->where('po.supplier_id', $id)
            ->orderBy('po.created_at', 'desc');

        $poRows = $poQuery
            ->select(
                'po.id',
                'po.status',
                'po.external_ref',
                'po.created_at',
                's.name as store_name'
            )
            ->limit(100)
            ->get();

        // Stats: count + last PO date
        $statsRow = DB::table('purchase_orders')
            ->where('supplier_id', $id)
            ->select(
                DB::raw('COUNT(*) as po_count'),
                DB::raw('MAX(created_at) as last_po_date')
            )
            ->first();

        $poCount    = (int) ($statsRow->po_count ?? 0);
        $lastPoDate = $statsRow->last_po_date ?? null;

        // Items received: from stock_moves where type='receive' AND ref_id is a PO of this supplier
        $receivedRows = DB::table('stock_moves as sm')
            ->join('purchase_orders as po', 'po.id', '=', 'sm.ref_id')
            ->join('product_variants as v', 'v.id', '=', 'sm.variant_id')
            ->join('products as p', 'p.id', '=', 'v.product_id')
            ->where('po.supplier_id', $id)
            ->where('sm.type', 'receive')
            ->select(
                'v.sku',
                'p.name as product_name',
                DB::raw('SUM(sm.qty) as total_qty')
            )
            ->groupBy('v.sku', 'p.name')
            ->orderByDesc(DB::raw('SUM(sm.qty)'))
            ->limit(50)
            ->get();

        return [
            'supplier' => [
                'id'           => $supplier->id,
                'name'         => $supplier->name,
                'contact_name' => $supplier->contact_name,
                'phone'        => $supplier->phone,
                'email'        => $supplier->email,
                'city'         => $supplier->city,
                'address'      => $supplier->address,
                'notes'        => $supplier->notes,
                'active'       => (bool) $supplier->active,
                'created_at'   => $supplier->created_at,
            ],
            'stats' => [
                'po_count'     => $poCount,
                'last_po_date' => $lastPoDate,
            ],
            'purchase_orders' => $poRows->map(function ($po) {
                return [
                    'id'          => $po->id,
                    'status'      => $po->status,
                    'external_ref'=> $po->external_ref,
                    'store_name'  => $po->store_name,
                    'created_at'  => $po->created_at,
                ];
            }),
            'items_received' => $receivedRows->map(function ($row) {
                return [
                    'sku'        => $row->sku,
                    'product'    => $row->product_name,
                    'total_qty'  => (float) $row->total_qty,
                ];
            }),
        ];
    }

    /**
     * POST /api/suppliers
     * Create a new supplier
     */
    public function store(Request $request)
    {
        $request->validate([
            'name'         => ['required', 'string', 'max:255'],
            'contact_name' => ['nullable', 'string', 'max:255'],
            'phone'        => ['nullable', 'string', 'max:255'],
            'email'        => ['nullable', 'email', 'max:255'],
            'city'         => ['nullable', 'string', 'max:255'],
            'address'      => ['nullable', 'string'],
            'notes'        => ['nullable', 'string'],
            'active'       => ['nullable', 'boolean'],
        ]);

        $name         = trim((string) $request->input('name', ''));
        $contactName  = $request->input('contact_name');
        $phone        = $request->input('phone');
        $email        = $request->input('email');
        $city         = $request->input('city');
        $address      = $request->input('address');
        $notes        = $request->input('notes');
        $activeInput  = $request->input('active', true);

        $id = DB::table('suppliers')->insertGetId([
            'name'         => $name,
            'contact_name' => $contactName !== '' ? $contactName : null,
            'phone'        => $phone !== '' ? $phone : null,
            'email'        => $email !== '' ? $email : null,
            'city'         => $city !== '' ? $city : null,
            'address'      => $address !== '' ? $address : null,
            'notes'        => $notes !== '' ? $notes : null,
            'active'       => (bool) $activeInput,
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);

        $row = DB::table('suppliers')->where('id', $id)->first();

        return response()->json([
            'ok'   => true,
            'id'   => $id,
            'data' => [
                'id'           => $row->id,
                'name'         => $row->name,
                'contact_name' => $row->contact_name,
                'phone'        => $row->phone,
                'email'        => $row->email,
                'city'         => $row->city,
                'address'      => $row->address,
                'notes'        => $row->notes,
                'active'       => (bool) $row->active,
                'created_at'   => $row->created_at,
            ],
        ], 201);
    }

    /**
     * PUT /api/suppliers/{id}
     */
    public function update(int $id, Request $request)
    {
        $exists = DB::table('suppliers')->where('id', $id)->exists();
        if (!$exists) {
            return response()->json(['error' => 'Supplier not found'], 404);
        }

        $request->validate([
            'name'         => ['sometimes', 'string', 'max:255'],
            'contact_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'phone'        => ['sometimes', 'nullable', 'string', 'max:255'],
            'email'        => ['sometimes', 'nullable', 'email', 'max:255'],
            'city'         => ['sometimes', 'nullable', 'string', 'max:255'],
            'address'      => ['sometimes', 'nullable', 'string'],
            'notes'        => ['sometimes', 'nullable', 'string'],
            'active'       => ['sometimes', 'boolean'],
        ]);

        $update = [];

        if ($request->has('name')) {
            $update['name'] = trim((string) $request->input('name'));
        }
        if ($request->has('contact_name')) {
            $val = $request->input('contact_name');
            $update['contact_name'] = $val !== '' ? $val : null;
        }
        if ($request->has('phone')) {
            $val = $request->input('phone');
            $update['phone'] = $val !== '' ? $val : null;
        }
        if ($request->has('email')) {
            $val = $request->input('email');
            $update['email'] = $val !== '' ? $val : null;
        }
        if ($request->has('city')) {
            $val = $request->input('city');
            $update['city'] = $val !== '' ? $val : null;
        }
        if ($request->has('address')) {
            $val = $request->input('address');
            $update['address'] = $val !== '' ? $val : null;
        }
        if ($request->has('notes')) {
            $val = $request->input('notes');
            $update['notes'] = $val !== '' ? $val : null;
        }
        if ($request->has('active')) {
            $update['active'] = (bool) $request->input('active');
        }

        if (!empty($update)) {
            $update['updated_at'] = now();
            DB::table('suppliers')->where('id', $id)->update($update);
        }

        $row = DB::table('suppliers')->where('id', $id)->first();

        return [
            'ok'   => true,
            'data' => [
                'id'           => $row->id,
                'name'         => $row->name,
                'contact_name' => $row->contact_name,
                'phone'        => $row->phone,
                'email'        => $row->email,
                'city'         => $row->city,
                'address'      => $row->address,
                'notes'        => $row->notes,
                'active'       => (bool) $row->active,
                'created_at'   => $row->created_at,
            ],
        ];
    }
}
