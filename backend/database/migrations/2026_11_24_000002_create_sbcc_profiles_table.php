<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up():void {Schema::create('sbcc_profiles',function(Blueprint $t){$t->foreignId('user_id')->primary()->constrained('users')->cascadeOnDelete();$t->jsonb('data');$t->timestampTz('updated_at')->nullable();});}
 public function down():void {Schema::dropIfExists('sbcc_profiles');}
};
