<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RefundLine extends Model
{
    use HasFactory;

    protected $table = 'refund_lines';

    protected $fillable = [
        'refund_id',
        'product_id',
        'variant_id',
        'qty',
        'price',
        'total',
    ];

    protected $casts = [
        'product_id' => 'string',  // UUID
        'variant_id' => 'string',  // UUID
        'qty'        => 'integer',
        'price'      => 'decimal:2',
        'total'      => 'decimal:2',
    ];

    public function refund()
    {
        return $this->belongsTo(Refund::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }
}
