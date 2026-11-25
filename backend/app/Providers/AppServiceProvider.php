<?php
namespace App\Providers;
use Illuminate\Support\ServiceProvider;
class AppServiceProvider extends ServiceProvider { public function register(): void {} public function boot(): void {
  \Illuminate\Support\Facades\Gate::define('manage-account-roles',fn (\App\Models\User $user):bool => $user->isPrimaryOwner());
 } }
