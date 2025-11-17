<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class StoreRegisterSeeder extends Seeder
{
    public function run(): void
    {
        // Wrap in transaction for safety
        DB::transaction(function () {
            // Organization
            $orgId = DB::table('organizations')->updateOrInsert(
                ['name' => 'GoWireless Direct'],
                ['updated_at' => now(), 'created_at' => now()]
            );

            // updateOrInsert doesn't give ID, so fetch it
            $org = DB::table('organizations')->where('name', 'GoWireless Direct')->first();
            $orgId = $org->id;

            // Stores
            $retailId = DB::table('stores')->updateOrInsert(
                ['code' => 'BZE-RETAIL'],
                [
                    'organization_id' => $orgId,
                    'name'           => 'Retail Belize City',
                    'address'        => 'Downtown Belize City',
                    'timezone'       => 'America/Belize',
                    'created_at'     => now(),
                    'updated_at'     => now(),
                ]
            );

            $wholesaleId = DB::table('stores')->updateOrInsert(
                ['code' => 'BZE-WHOLESALE'],
                [
                    'organization_id' => $orgId,
                    'name'           => 'Wholesale Belize City',
                    'address'        => 'Belize City Wholesale',
                    'timezone'       => 'America/Belize',
                    'created_at'     => now(),
                    'updated_at'     => now(),
                ]
            );

            // Fetch IDs to be sure
            $retailStore = DB::table('stores')->where('code', 'BZE-RETAIL')->first();
            $whStore     = DB::table('stores')->where('code', 'BZE-WHOLESALE')->first();

            // Registers
            DB::table('registers')->updateOrInsert(
                ['device_key' => 'retail-front-counter'],
                [
                    'store_id'   => $retailStore->id,
                    'name'       => 'Front Counter',
                    'is_active'  => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );

            DB::table('registers')->updateOrInsert(
                ['device_key' => 'wholesale-counter'],
                [
                    'store_id'   => $whStore->id,
                    'name'       => 'Wholesale Counter',
                    'is_active'  => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        });
    }
}
