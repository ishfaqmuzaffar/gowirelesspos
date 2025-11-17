<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LoyaltyController extends Controller
{
    /**
     * GET /api/loyalty/lookup?phone=&email=
     *
     * Looks up a customer by phone and/or email and returns their loyalty info.
     * Response:
     *  {
     *    "found": true/false,
     *    "customer": {
     *      "id": ...,
     *      "name": "...",
     *      "phone": "...",
     *      "email": "...",
     *      "points": 123,
     *      "lifetime": 456
     *    }
     *  }
     */
    public function lookup(Request $request)
    {
        $phone = trim((string) $request->query('phone', ''));
        $email = trim((string) $request->query('email', ''));

        if ($phone === '' && $email === '') {
            return response()->json([
                'found'    => false,
                'customer' => null,
                'error'    => 'Provide phone or email for loyalty lookup.',
            ], 400);
        }

        $q = DB::table('customers');

        if ($phone !== '') {
            $q->where('phone', $phone);
        }

        if ($email !== '') {
            // If both phone and email are provided, require BOTH to match
            if ($phone !== '') {
                $q->where('email', $email);
            } else {
                $q->orWhere('email', $email);
            }
        }

        $customer = $q->first();

        if (!$customer) {
            return [
                'found'    => false,
                'customer' => null,
            ];
        }

        // These columns should exist from the loyalty migrations
        $points   = (int) ($customer->loyalty_points_balance ?? 0);
        $lifetime = (int) ($customer->loyalty_points_lifetime_earned ?? 0);

        return [
            'found'    => true,
            'customer' => [
                'id'       => $customer->id,
                'name'     => $customer->name,
                'phone'    => $customer->phone,
                'email'    => $customer->email,
                'points'   => $points,
                'lifetime' => $lifetime,
            ],
        ];
    }
}
