<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProductAdminController extends Controller
{
    /**
     * GET /api/admin/products?q=
     * List products with variants for admin screen.
     */
    public function index(Request $request)
    {
        $q = trim((string) $request->query('q', ''));

        $rows = DB::table('products as p')
            ->leftJoin('product_variants as v', 'v.product_id', '=', 'p.id')
            ->select(
                'p.id as product_id',
                'p.name',
                'p.category',
                'p.description',
                'p.track_serial',
                'p.active',
                'p.main_image_path',
                'v.id as variant_id',
                'v.sku as variant_sku',
                'v.barcode',
                'v.price',
                'v.cost',
                'v.active as variant_active',
                'v.attributes'
            )
            ->when($q !== '', function ($query) use ($q) {
                $like = '%' . $q . '%';
                $query->where(function ($sub) use ($like) {
                    $sub->where('p.name', 'ILIKE', $like)
                        ->orWhere('p.category', 'ILIKE', $like)
                        ->orWhere('v.sku', 'ILIKE', $like)
                        ->orWhere('v.barcode', 'ILIKE', $like);
                });
            })
            ->orderBy('p.name')
            ->orderBy('v.sku')
            ->get();

        if ($rows->isEmpty()) {
            return [];
        }

        // ✅ Build base URL from the real request host:port (e.g. http://localhost:8080)
        $baseUrl = rtrim($request->getSchemeAndHttpHost(), '/');

        $byProduct = [];
        foreach ($rows as $row) {
            if (!isset($byProduct[$row->product_id])) {
                $relative = null;
                $fullUrl  = null;

                if ($row->main_image_path) {
                    // /storage/product-images/...
                    $relative = Storage::url($row->main_image_path);
                    // http://localhost:8080/storage/product-images/...
                    $fullUrl  = $baseUrl . $relative;
                }

                $byProduct[$row->product_id] = [
                    'id'              => $row->product_id,
                    'name'            => $row->name,
                    'category'        => $row->category,
                    'description'     => $row->description,
                    'track_serial'    => (bool) $row->track_serial,
                    'active'          => (bool) $row->active,
                    'main_image_path' => $row->main_image_path,
                    'main_image_url'  => $fullUrl,
                    'variants'        => [],
                ];
            }

            if ($row->variant_id) {
                $attrs = null;
                if (!empty($row->attributes)) {
                    $decoded = json_decode($row->attributes, true);
                    if (is_array($decoded)) {
                        $attrs = $decoded;
                    }
                }

                $byProduct[$row->product_id]['variants'][] = [
                    'id'         => $row->variant_id,
                    'sku'        => $row->variant_sku,
                    'barcode'    => $row->barcode,
                    'price'      => (float) $row->price,
                    'cost'       => (float) $row->cost,
                    'active'     => (bool) $row->variant_active,
                    'attributes' => $attrs,
                ];
            }
        }

        return array_values($byProduct);
    }

    /**
     * POST /api/admin/products
     * Create product + variants (with optional image).
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'         => ['required', 'string', 'max:255'],
            'category'     => ['nullable', 'string', 'max:255'],
            'description'  => ['nullable', 'string'],
            'track_serial' => ['nullable'],
            'image'        => ['nullable', 'image', 'max:5120'],
            'variants'     => ['required', 'string'], // JSON string
        ]);

        $variants = json_decode($validated['variants'], true);
        if (!is_array($variants) || empty($variants)) {
            return response()->json(['error' => 'At least one variant is required.'], 422);
        }

        $normalizedVariants = [];
        foreach ($variants as $v) {
            if (empty($v['sku'])) {
                continue;
            }
            $normalizedVariants[] = [
                'sku'        => $v['sku'],
                'barcode'    => $v['barcode'] ?? null,
                'price'      => isset($v['price']) ? (float) $v['price'] : 0.0,
                'cost'       => isset($v['cost']) ? (float) $v['cost'] : 0.0,
                'attributes' => isset($v['attributes']) && is_array($v['attributes'])
                    ? $v['attributes']
                    : [],
            ];
        }

        if (empty($normalizedVariants)) {
            return response()->json(['error' => 'At least one variant with SKU is required.'], 422);
        }

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('product-images', 'public');
        }

        $productId = Str::uuid()->toString();

        DB::transaction(function () use ($validated, $imagePath, $productId, $normalizedVariants) {
            DB::table('products')->insert([
                'id'              => $productId,
                'name'            => $validated['name'],
                'category'        => $validated['category'] ?? null,
                'description'     => $validated['description'] ?? null,
                'track_serial'    => !empty($validated['track_serial']),
                'active'          => true,
                'main_image_path' => $imagePath,
                'created_at'      => now(),
                'updated_at'      => now(),
            ]);

            foreach ($normalizedVariants as $v) {
                $variantId = Str::uuid()->toString();

                DB::table('product_variants')->insert([
                    'id'         => $variantId,
                    'product_id' => $productId,
                    'sku'        => $v['sku'],
                    'barcode'    => $v['barcode'],
                    'price'      => $v['price'],
                    'cost'       => $v['cost'],
                    'active'     => true,
                    'attributes' => json_encode($v['attributes']),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        });

        return response()->json(['ok' => true, 'id' => $productId], 201);
    }

    /**
     * PUT /api/admin/products/{id}
     * Update product details (not variants).
     */
    public function update(Request $request, string $id)
    {
        $validated = $request->validate([
            'name'         => ['required', 'string', 'max:255'],
            'category'     => ['nullable', 'string', 'max:255'],
            'description'  => ['nullable', 'string'],
            'track_serial' => ['nullable'],
            'active'       => ['nullable'],
            'image'        => ['nullable', 'image', 'max:5120'],
        ]);

        $product = DB::table('products')->where('id', $id)->first();
        if (!$product) {
            return response()->json(['error' => 'Product not found'], 404);
        }

        $imagePath = $product->main_image_path;

        if ($request->hasFile('image')) {
            if ($imagePath && Storage::disk('public')->exists($imagePath)) {
                Storage::disk('public')->delete($imagePath);
            }
            $imagePath = $request->file('image')->store('product-images', 'public');
        }

        DB::table('products')->where('id', $id)->update([
            'name'            => $validated['name'],
            'category'        => $validated['category'] ?? null,
            'description'     => $validated['description'] ?? null,
            'track_serial'    => !empty($validated['track_serial']),
            'active'          => !empty($validated['active']),
            'main_image_path' => $imagePath,
            'updated_at'      => now(),
        ]);

        return ['ok' => true];
    }

    /**
     * POST /api/admin/products/{id}/variants
     * Add a new variant to existing product.
     */
    public function storeVariant(Request $request, string $productId)
    {
        $validated = $request->validate([
            'sku'        => ['required', 'string', 'max:255'],
            'barcode'    => ['nullable', 'string', 'max:255'],
            'price'      => ['required', 'numeric'],
            'cost'       => ['nullable', 'numeric'],
            'attributes' => ['nullable', 'array'],
        ]);

        $product = DB::table('products')->where('id', $productId)->first();
        if (!$product) {
            return response()->json(['error' => 'Product not found'], 404);
        }

        $variantId = Str::uuid()->toString();

        DB::table('product_variants')->insert([
            'id'         => $variantId,
            'product_id' => $productId,
            'sku'        => $validated['sku'],
            'barcode'    => $validated['barcode'] ?? null,
            'price'      => (float) $validated['price'],
            'cost'       => isset($validated['cost']) ? (float) $validated['cost'] : 0.0,
            'active'     => true,
            'attributes' => isset($validated['attributes'])
                ? json_encode($validated['attributes'])
                : json_encode([]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return ['ok' => true, 'id' => $variantId];
    }

    /**
     * PUT /api/admin/variants/{id}
     * Update an existing variant.
     */
    public function updateVariant(Request $request, string $variantId)
    {
        $validated = $request->validate([
            'sku'        => ['required', 'string', 'max:255'],
            'barcode'    => ['nullable', 'string', 'max:255'],
            'price'      => ['required', 'numeric'],
            'cost'       => ['nullable', 'numeric'],
            'active'     => ['nullable'],
            'attributes' => ['nullable', 'array'],
        ]);

        $variant = DB::table('product_variants')->where('id', $variantId)->first();
        if (!$variant) {
            return response()->json(['error' => 'Variant not found'], 404);
        }

        DB::table('product_variants')->where('id', $variantId)->update([
            'sku'        => $validated['sku'],
            'barcode'    => $validated['barcode'] ?? null,
            'price'      => (float) $validated['price'],
            'cost'       => isset($validated['cost']) ? (float) $validated['cost'] : 0.0,
            'active'     => isset($validated['active']) ? !empty($validated['active']) : $variant->active,
            'attributes' => isset($validated['attributes'])
                ? json_encode($validated['attributes'])
                : $variant->attributes,
            'updated_at' => now(),
        ]);

        return ['ok' => true];
    }

    /**
     * DELETE /api/admin/variants/{id}
     * Soft deactivate a variant.
     */
    public function deactivateVariant(string $variantId)
    {
        $variant = DB::table('product_variants')->where('id', $variantId)->first();
        if (!$variant) {
            return response()->json(['error' => 'Variant not found'], 404);
        }

        DB::table('product_variants')->where('id', $variantId)->update([
            'active'     => false,
            'updated_at' => now(),
        ]);

        return ['ok' => true];
    }
}
