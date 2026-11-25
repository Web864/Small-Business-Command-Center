<?php
namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\{Auth,DB,Hash};

class ResetOwnerPassword extends Command
{
    protected $signature='sbcc:reset-owner-password {email}';
    protected $description='Interactively reset only the configured Primary Owner password on a local server.';

    public function handle(): int
    {
        if (!app()->runningInConsole() || !app()->environment('local') || !$this->input->isInteractive()) {
            $this->error('Reset requires an interactive trusted terminal and APP_ENV=local. No password was changed.');
            return self::FAILURE;
        }
        $email=strtolower(trim((string)$this->argument('email')));
        $configured=config('sbcc.primary_owner_email');
        if (!filter_var($email,FILTER_VALIDATE_EMAIL) || !is_string($configured) || !hash_equals($configured,$email)) {
            $this->error('Email must match the server-configured Primary Owner. No password was changed.');
            return self::FAILURE;
        }
        $matches=User::whereRaw('lower(email) = ?',[$email])->get();
        if ($matches->count()!==1 || !$matches->first()->isPrimaryOwner()) {
            $this->error('Expected exactly one existing account with the Primary Owner role. No password was changed.');
            return self::FAILURE;
        }
        if (!$this->confirm('Reset only the password for this existing Primary Owner account?',false)) {
            $this->info('Cancelled. No password was changed.');
            return self::SUCCESS;
        }
        $password=null;
        $confirmation=null;
        try {
            // Disable visible-input fallback: abort if the terminal cannot hide input.
            $password=$this->secret('New password (12 to 72 bytes)',false);
            $confirmation=$this->secret('Confirm new password',false);
            if (!is_string($password) || strlen($password)<12 || strlen($password)>72 || !is_string($confirmation) || !hash_equals($password,$confirmation)) {
                $this->error('Passwords must match and contain 12 to 72 bytes. No password was changed.');
                return self::FAILURE;
            }
            $id=$matches->first()->id;
            DB::transaction(function () use ($id,$email,$password) {
                DB::select('select pg_advisory_xact_lock(1935827811)');
                $user=User::whereKey($id)->lockForUpdate()->firstOrFail();
                if (!$user->isPrimaryOwner() || strtolower($user->email)!==$email) {
                    throw new \RuntimeException('Owner identity changed.');
                }
                // Direct single-column update intentionally preserves timestamps and remember_token.
                DB::table('users')->where('id',$id)->update(['password'=>Hash::make($password)]);
                $provider=Auth::guard('web')->getProvider();
                $fresh=$provider->retrieveByCredentials(['email'=>$user->email]);
                if (!$fresh || $fresh->getAuthIdentifier()!==$id || !$provider->validateCredentials($fresh,['password'=>$password])) {
                    throw new \RuntimeException('Authentication verification failed.');
                }
            });
            $this->info('Password reset complete. Laravel authentication verified. Only the password hash changed.');
            return self::SUCCESS;
        } catch (\Throwable $exception) {
            // Never render/log exceptions carrying credentials or the hidden prompt's input.
            $this->error('Reset could not complete securely. Any database change was rolled back. Use a terminal supporting hidden input.');
            return self::FAILURE;
        } finally {
            unset($password,$confirmation);
        }
    }
}
