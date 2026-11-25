<?php
namespace App\Models;
use Illuminate\Foundation\Auth\User as Authenticatable;
class User extends Authenticatable {
 use \Illuminate\Database\Eloquent\Factories\HasFactory;
 protected $fillable=['email','name','password'];
 protected $hidden=['password','remember_token'];
 protected function casts(): array {return ['password'=>'hashed','email_verified_at'=>'datetime'];}
 public function isPrimaryOwner():bool {
  $email=config('sbcc.primary_owner_email');
  return $this->role==='owner' && is_string($email) && $email!=='' && hash_equals($email,strtolower(trim($this->email)));
 }
 public function isManager():bool {return in_array($this->role,['owner','admin'],true);}
}
