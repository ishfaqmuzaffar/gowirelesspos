<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    // Table name
    protected $table = 'orders';

    // Fillable columns (you can extend this as you like)
    protected $fillable = [
        'store_id',
        'customer_id',
        'status',
        'source',
        'total',
        'refunded_total',
        'refund_status',
        // add any other columns you have if needed
    ];

    protected $casts = [
        'total'          => 'decimal:2',
        'refunded_total' => 'decimal:2',
    ];

    // Relationships you can extend later. For now, kept very minimal.
    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // If you already have an OrderLine / OrderItem model, you can wire it here later.
    // public function lines()
    // {
    //     return $this->hasMany(OrderLine::class);
    // }
}
