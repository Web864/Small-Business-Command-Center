<?php
namespace App\Console\Commands;

use App\Services\RoleManager;
use Illuminate\Console\Command;
use Illuminate\Validation\ValidationException;

class CreateOwner extends Command
{
    protected $signature='sbcc:create-owner {email} {--bootstrap : Explicit first-owner account creation}';
    protected $description='Bootstrap a new configured Primary Owner; use sbcc:grant-owner for an existing account.';

    public function handle(RoleManager $roles): int
    {
        if (!$this->option('bootstrap')) {
            $this->error('New first-owner creation requires --bootstrap and trusted SBCC_PRIMARY_OWNER_EMAIL configuration. Existing accounts: use sbcc:grant-owner.');
            return self::FAILURE;
        }
        $email=strtolower(trim((string)$this->argument('email')));
        if (!filter_var($email,FILTER_VALIDATE_EMAIL) || $email!==config('sbcc.primary_owner_email')) {
            $this->error('Email must match the server-configured Primary Owner.');
            return self::FAILURE;
        }
        if (\App\Models\User::whereRaw('lower(email) = ?',[$email])->exists()) {
            $this->error('Account exists. Use sbcc:grant-owner; its password and records will be preserved.');
            return self::FAILURE;
        }
        if (\App\Models\User::where('role','owner')->exists()) {
            $this->error('An Owner already exists; initial account creation is closed.');
            return self::FAILURE;
        }
        $password=$this->secret('Choose a private local password (10 to 200 characters)');
        try {
            $roles->createPrimaryOwner($email,is_string($password)?$password:'');
            $this->info('Primary Owner created through explicit server bootstrap.');
            return self::SUCCESS;
        } catch (ValidationException $exception) {
            foreach ($exception->errors() as $messages) foreach ($messages as $message) $this->error($message);
            return self::FAILURE;
        }
    }
}
