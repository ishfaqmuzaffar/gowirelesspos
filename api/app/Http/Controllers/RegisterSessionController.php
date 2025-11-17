<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class RegisterSessionController extends Controller
{
    /**
     * Get the current open session for a register, plus summary.
     */
    public function current($registerId)
    {
        $session = DB::table('register_sessions')
            ->where('register_id', $registerId)
            ->where('status', 'open')
            ->orderByDesc('opened_at')
            ->first();

        if (! $session) {
            return response()->json(['session' => null], 200);
        }

        // Compute expected cash live (in case we want real-time numbers)
        $expectedCash = $this->computeExpectedCash($session);

        return response()->json([
            'session' => [
                'id'             => $session->id,
                'store_id'       => $session->store_id,
                'register_id'    => $session->register_id,
                'user_id'        => $session->user_id,
                'opening_amount' => $session->opening_amount,
                'expected_cash'  => $expectedCash,
                'opened_at'      => $session->opened_at,
                'status'         => $session->status,
                'notes'          => $session->notes,
            ],
        ]);
    }

    /**
     * Open a new register session.
     */
    public function open(Request $request, $registerId)
    {
        $user = Auth::user();

        // Ensure no open session for this register
        $existing = DB::table('register_sessions')
            ->where('register_id', $registerId)
            ->where('status', 'open')
            ->first();

        if ($existing) {
            return response()->json([
                'error' => 'This register already has an open session.',
            ], 422);
        }

        $data = $request->validate([
            'store_id'        => ['required', 'integer'], // you already know store in frontend
            'opening_amount'  => ['required', 'numeric', 'min:0'],
            'notes'           => ['nullable', 'string'],
        ]);

        $sessionId = DB::table('register_sessions')->insertGetId([
            'store_id'       => $data['store_id'],
            'register_id'    => $registerId,
            'user_id'        => $user->id,
            'opening_amount' => $data['opening_amount'],
            'expected_cash'  => $data['opening_amount'], // will be recomputed later
            'status'         => 'open',
            'opened_at'      => now(),
            'notes'          => $data['notes'] ?? null,
            'created_at'     => now(),
            'updated_at'     => now(),
        ]);

        $session = DB::table('register_sessions')->where('id', $sessionId)->first();

        return response()->json([
            'session' => $session,
        ], 201);
    }

    /**
     * Close the current open session: compute expected cash, record counted, difference.
     */
    public function close(Request $request, $registerId)
    {
        $user = Auth::user();

        $session = DB::table('register_sessions')
            ->where('register_id', $registerId)
            ->where('status', 'open')
            ->orderByDesc('opened_at')
            ->lockForUpdate()
            ->first();

        if (! $session) {
            return response()->json([
                'error' => 'No open session for this register.',
            ], 422);
        }

        $data = $request->validate([
            'counted_cash' => ['required', 'numeric', 'min:0'],
            'notes'        => ['nullable', 'string'],
        ]);

        $expectedCash = $this->computeExpectedCash($session);
        $difference   = round($data['counted_cash'] - $expectedCash, 2);

        DB::table('register_sessions')
            ->where('id', $session->id)
            ->update([
                'expected_cash' => $expectedCash,
                'counted_cash'  => $data['counted_cash'],
                'difference'    => $difference,
                'status'        => 'closed',
                'closed_at'     => now(),
                'notes'         => $data['notes'] ?? $session->notes,
                'updated_at'    => now(),
            ]);

        $session = DB::table('register_sessions')->where('id', $session->id)->first();

        return response()->json([
            'session' => $session,
        ]);
    }

    /**
     * Record a cash movement in the drawer for the current session.
     * Types: 'in', 'out', 'payout', 'drop'
     */
    public function cashMove(Request $request, $registerId)
    {
        $user = Auth::user();

        $session = DB::table('register_sessions')
            ->where('register_id', $registerId)
            ->where('status', 'open')
            ->orderByDesc('opened_at')
            ->first();

        if (! $session) {
            return response()->json([
                'error' => 'No open session for this register.',
            ], 422);
        }

        $data = $request->validate([
            'type'   => ['required', 'string'], // could validate allowed values
            'amount' => ['required', 'numeric', 'min:0.01'],
            'reason' => ['nullable', 'string'],
        ]);

        $id = DB::table('cash_transactions')->insertGetId([
            'register_session_id' => $session->id,
            'user_id'             => $user->id,
            'type'                => $data['type'],
            'amount'              => $data['amount'],
            'reason'              => $data['reason'] ?? null,
            'created_at'          => now(),
            'updated_at'          => now(),
        ]);

        $transaction = DB::table('cash_transactions')->where('id', $id)->first();

        return response()->json([
            'transaction' => $transaction,
        ], 201);
    }

    /**
     * Compute expected cash in drawer for a session:
     * opening + cash_sales - cash_refunds + net_cash_moves
     */
    protected function computeExpectedCash($session): float
    {
        $registerId = $session->register_id;
        $openedAt   = $session->opened_at;
        $now        = now();

        // Cash sales in this register during the session
        $cashSales = DB::table('payments as p')
            ->join('orders as o', 'o.id', '=', 'p.order_id')
            ->where('o.register_id', $registerId)
            ->where('p.method', 'cash')
            ->whereBetween('o.created_at', [$openedAt, $now])
            ->sum('p.amount');

        // Cash refunds
        $cashRefunds = DB::table('refund_payments as rp')
            ->join('refunds as r', 'r.id', '=', 'rp.refund_id')
            ->join('orders as o', 'o.id', '=', 'r.order_id')
            ->where('o.register_id', $registerId)
            ->where('rp.method', 'cash')
            ->whereBetween('r.created_at', [$openedAt, $now])
            ->sum('rp.amount');

        // Net cash drawer movements
        $cashMoves = DB::table('cash_transactions')
            ->where('register_session_id', $session->id)
            ->get()
            ->reduce(function ($carry, $row) {
                $amount = (float) $row->amount;
                switch ($row->type) {
                    case 'in':
                        return $carry + $amount;
                    case 'out':
                    case 'payout':
                    case 'drop':
                        return $carry - $amount;
                    default:
                        return $carry;
                }
            }, 0.0);

        $expected = (float) $session->opening_amount
            + (float) $cashSales
            - (float) $cashRefunds
            + (float) $cashMoves;

        return round($expected, 2);
    }
}
