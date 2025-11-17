<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoUserSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            [
                'name'  => 'Admin User',
                'email' => 'admin@gowireless.test',
                'role'  => 'admin',
            ],
            [
                'name'  => 'Manager User',
                'email' => 'manager@gowireless.test',
                'role'  => 'manager',
            ],
            [
                'name'  => 'Cashier User',
                'email' => 'cashier@gowireless.test',
                'role'  => 'cashier',
            ],
            [
                'name'  => 'Inventory User',
                'email' => 'inventory@gowireless.test',
                'role'  => 'inventory',
            ],
        ];

        foreach ($users as $u) {
            User::updateOrCreate(
                ['email' => $u['email']],
                [
                    'name'     => $u['name'],
                    'role'     => $u['role'],
                    'password' => Hash::make('password'), // same for all demo users
                ]
            );
        }
    }
}
