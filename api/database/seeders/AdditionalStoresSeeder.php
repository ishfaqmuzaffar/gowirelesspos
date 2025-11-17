<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder; use Illuminate\Support\Facades\DB;

class AdditionalStoresSeeder extends Seeder {
  public function run(): void {
    $exists = DB::table('stores')->where('code','STORE-2')->first();
    if(!$exists){
      $org = DB::table('organizations')->first();
      DB::table('stores')->insert([
        'organization_id'=>$org->id,
        'name'=>'Branch Store','code'=>'STORE-2','address'=>'','timezone'=>'America/Belize',
        'created_at'=>now(),'updated_at'=>now()
      ]);
    }
  }
}
