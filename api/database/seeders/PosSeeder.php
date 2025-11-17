<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class PosSeeder extends Seeder {
  public function run(): void {
    $orgId = DB::table("organizations")->insertGetId(["name"=>"GoWireless","created_at"=>now(),"updated_at"=>now()]);
    $storeId = DB::table("stores")->insertGetId([
      "organization_id"=>$orgId,"name"=>"Main Store","code"=>"STORE-1","address"=>"","timezone"=>"America/Belize","created_at"=>now(),"updated_at"=>now()
    ]);
    // Minimal user without roles
    $exists = DB::table('users')->where('email','admin@gowireless.test')->first();
    if(!$exists){
      DB::table('users')->insert([
        'name'=>'Admin','email'=>'admin@gowireless.test','password'=>Hash::make('password'),
        'created_at'=>now(),'updated_at'=>now()
      ]);
    }
    DB::table("registers")->insert([
      "store_id"=>$storeId,"name"=>"Front Register","device_key"=>bin2hex(random_bytes(8)),"is_active"=>true,"created_at"=>now(),"updated_at"=>now()
    ]);
  }
}
