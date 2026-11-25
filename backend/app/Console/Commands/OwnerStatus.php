<?php
namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class OwnerStatus extends Command
{
    protected $signature='sbcc:owner-status {email}';
    protected $description='Report only the role and Primary Owner designation of an existing account.';
    public function handle(): int
    {
        $email=strtolower(trim((string)$this->argument('email')));
        $matches=User::whereRaw('lower(email) = ?',[$email])->get();
        if ($matches->count()!==1) {
            $this->error('Expected exactly one existing account.');
            return self::FAILURE;
        }
        $user=$matches->first();
        $this->line('Role: '.$user->role);
        $this->line('Primary Owner: '.($user->isPrimaryOwner()?'yes':'no'));
        return self::SUCCESS;
    }
}
