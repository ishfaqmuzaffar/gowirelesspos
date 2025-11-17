<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        // Clear cached roles/permissions if registrar exists
        if (class_exists(\Spatie\Permission\PermissionRegistrar::class)) {
            app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
        }

        $permissions = [
            'sell',
            'view_sales_history',
            'manage_products',
            'view_inventory',
            'adjust_stock',
            'view_reports',
            'manage_users',
        ];

        foreach ($permissions as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }

        $admin   = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $manager = Role::firstOrCreate(['name' => 'manager', 'guard_name' => 'web']);
        $cashier = Role::firstOrCreate(['name' => 'cashier', 'guard_name' => 'web']);

        // Give all permissions to admin
        $admin->syncPermissions(Permission::all());

        // Manager: everything except manage_users
        $managerPerms = Permission::where('name', '!=', 'manage_users')->get();
        $manager->syncPermissions($managerPerms);

        // Cashier: minimal
        $cashier->syncPermissions([
            'sell',
            'view_sales_history',
        ]);

        // Assign Admin role to your seeded admin user
        $adminUser = User::where('email', 'admin@gowireless.test')->first();
        if ($adminUser) {
            $adminUser->assignRole('admin');
        }
    }
}
