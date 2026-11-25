<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class License extends Model {
 protected $fillable=['key_digest','buyer_email','status','claimed_by','installation','activated_at'];
 protected $hidden=['key_digest'];
 protected function casts():array{return ['activated_at'=>'datetime'];}
}
