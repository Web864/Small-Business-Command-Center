<?php
namespace Database\Factories;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
class UserFactory extends Factory {
 protected $model=User::class;
 public function definition():array{return ['name'=>'Test User','email'=>'test-'.\Illuminate\Support\Str::uuid().'@example.invalid','password'=>bcrypt('test-password-123'),'role'=>'customer'];}
}
