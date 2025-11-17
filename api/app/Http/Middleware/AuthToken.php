<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class AuthToken
{
    public function handle(Request $request, Closure $next)
    {
        $authHeader = $request->header('Authorization');

        if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        $plainToken = substr($authHeader, 7);
        $hashed = hash('sha256', $plainToken);

        $row = DB::table('api_tokens')->where('token', $hashed)->first();

        if (!$row) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        $user = User::find($row->user_id);
        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        Auth::setUser($user);

        DB::table('api_tokens')->where('id', $row->id)->update([
            'last_used_at' => now(),
        ]);

        return $next($request);
    }
}
