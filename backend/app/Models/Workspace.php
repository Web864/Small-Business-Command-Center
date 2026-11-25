<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Workspace extends Model {
 protected $primaryKey='user_id'; public $incrementing=false; protected $keyType='int';
 protected $fillable=['user_id','revision','data'];
 protected function casts():array{return ['revision'=>'integer','data'=>'array'];}
}
