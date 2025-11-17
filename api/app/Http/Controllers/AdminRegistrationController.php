<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminRegistrationController extends Controller
{
    /**
     * Only allow registration if no admin exists yet.
     */
    public function canRegister()
    {
        $hasAdmin = User::where('role', 'admin')->exists();

        return response()->json([
            'can_register' => ! $hasAdmin,
        ]);
    }

    /**
     * Register the first admin and return token + user (same shape as login).
     */
    public function register(Request $request)
    {
        $hasAdmin = User::where('role', 'admin')->exists();

        if ($hasAdmin) {
            return response()->json([
                'error' => 'Admin already exists. Registration is disabled.',
            ], 409);
        }

        $data = $request->validate([
            'name'                  => ['required', 'string', 'max:255'],
            'email'                 => ['required', 'email', 'max:255', 'unique:users,email'],
            'password'              => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = User::create([
            'name'      => $data['name'],
            'email'     => $data['email'],
            'password'  => Hash::make($data['password']),
            'role'      => 'admin',
        ]);

        // IMPORTANT: match your existing login logic.
        // Assuming JWT (tymon/jwt-auth) with `auth('api')`:
        $token = auth('api')->login($user);

        return response()->json([
            'token' => $token,
            'user'  => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'role'  => $user->role,
            ],
        ], 201);
    }
}
