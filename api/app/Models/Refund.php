<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Refund extends Model
{
    use HasFactory;

    protected $table = 'refunds';

    protected $fillable = [
        'order_id',
        'store_id',
        'user_id',
        'total_amount',
        'return_to_inventory',
        'notes',
    ];

    protected $casts = [
        'return_to_inventory' => 'boolean',
        'total_amount' => 'decimal:2',
    ];

    // Relationships

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function lines()
    {
        return $this->hasMany(RefundLine::class);
    }

    public function payments()
    {
        return $this->hasMany(RefundPayment::class);
    }
}
