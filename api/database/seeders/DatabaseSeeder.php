<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Other seeders (if any) can go here
        $this->call([
            RolePermissionSeeder::class,
        ]);
    }
}
