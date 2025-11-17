<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserAdminController extends Controller
{
    /**
     * GET /api/admin/users
     * List all users (admin only)
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user || $user->role !== 'admin') {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $rows = DB::table('users')
            ->select('id', 'name', 'email', 'role', 'created_at')
            ->orderBy('name')
            ->get();

        return $rows;
    }

    /**
     * POST /api/admin/users
     * Create a user (admin only)
     *
     * Expected JSON body:
     * {
     *   "name": "John Doe",
     *   "email": "john@example.com",
     *   "password": "secret",
     *   "role": "cashier" | "manager" | "admin"
     * }
     */
    public function store(Request $request)
    {
        $authUser = $request->user();
        if (!$authUser || $authUser->role !== 'admin') {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'name'     => ['required', 'string', 'max:255'],
            'email'    => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'role'     => ['required', 'string', 'in:admin,manager,cashier'],
        ]);

        $id = DB::table('users')->insertGetId([
            'name'       => $data['name'],
            'email'      => $data['email'],
            'password'   => Hash::make($data['password']),
            'role'       => $data['role'],
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'ok'   => true,
            'id'   => $id,
            'user' => [
                'id'    => $id,
                'name'  => $data['name'],
                'email' => $data['email'],
                'role'  => $data['role'],
            ],
        ], 201);
    }
}
