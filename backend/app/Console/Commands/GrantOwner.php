<?php
namespace App\Console\Commands;

use App\Services\RoleManager;
use Illuminate\Console\Command;
use Illuminate\Validation\ValidationException;

class GrantOwner extends Command
{
    protected $signature='sbcc:grant-owner {email} {--bootstrap : Required only when no Owner exists} {--confirm-email= : Repeat the exact target email to acknowledge the privileged change}';
    protected $description='Promote the configured existing Primary Owner through trusted server CLI without resetting the account.';

    public function handle(RoleManager $roles): int
    {
        $email=strtolower(trim((string)$this->argument('email')));
        if (!filter_var($email,FILTER_VALIDATE_EMAIL) || $email!==strtolower(trim((string)$this->option('confirm-email')))) {
            $this->error('Supply a valid email and repeat it with --confirm-email. No account was modified.');
            return self::FAILURE;
        }
        try {
            $changed=$roles->grantPrimaryOwner($email,(bool)$this->option('bootstrap'));
            $this->info($changed?'Primary Owner promoted. Password, user ID and business records preserved.':'Already Primary Owner; no account changes made.');
            return self::SUCCESS;
        } catch (ValidationException $exception) {
            foreach ($exception->errors() as $messages) foreach ($messages as $message) $this->error($message);
            return self::FAILURE;
        }
    }
}
