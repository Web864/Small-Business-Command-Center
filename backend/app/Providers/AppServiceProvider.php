<?php
namespace App\Providers;
use Illuminate\Support\ServiceProvider;
class AppServiceProvider extends ServiceProvider { public function register(): void {} public function boot(): void {
  $proxies=trim((string)config('sbcc.trusted_proxies'));
  if($proxies!=='')\Illuminate\Http\Middleware\TrustProxies::at($proxies==='*'?'*':array_map('trim',explode(',',$proxies)));
  \Illuminate\Support\Facades\Gate::define('manage-account-roles',fn (\App\Models\User $user):bool => $user->isPrimaryOwner());
 } }
