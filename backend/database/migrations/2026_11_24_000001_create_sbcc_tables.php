<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up():void {
  Schema::create('users',function(Blueprint $t){$t->id();$t->string('name')->default('');$t->string('email')->unique();$t->timestamp('email_verified_at')->nullable();$t->string('password');$t->string('role')->default('customer');$t->rememberToken();$t->timestamps();});
  Schema::create('password_reset_tokens',function(Blueprint $t){$t->string('email')->primary();$t->string('token');$t->timestamp('created_at')->nullable();});
  Schema::create('workspaces',function(Blueprint $t){$t->foreignId('user_id')->primary()->constrained('users')->cascadeOnDelete();$t->unsignedBigInteger('revision')->default(0);$t->jsonb('data');$t->timestamps();});
  Schema::create('licenses',function(Blueprint $t){$t->id();$t->string('key_digest',64)->unique();$t->string('buyer_email')->index();$t->string('status')->default('issued');$t->foreignId('claimed_by')->nullable()->unique()->constrained('users')->nullOnDelete();$t->string('installation',128)->nullable();$t->timestampTz('activated_at')->nullable();$t->timestamps();});
  Schema::create('audit_events',function(Blueprint $t){$t->id();$t->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();$t->string('action');$t->jsonb('detail')->default('{}');$t->timestamps();});
 }
 public function down():void {Schema::dropIfExists('audit_events');Schema::dropIfExists('licenses');Schema::dropIfExists('workspaces');Schema::dropIfExists('password_reset_tokens');Schema::dropIfExists('users');}
};
