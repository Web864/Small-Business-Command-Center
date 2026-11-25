<?php
namespace App\Services;

use App\Models\{User,Workspace};
use Illuminate\Support\Facades\{DB,Gate,Hash};
use Illuminate\Validation\ValidationException;

final class RoleManager
{
    private function primaryEmail(string $email): string
    {
        $email = strtolower(trim($email));
        $configured = config('sbcc.primary_owner_email');
        if (!is_string($configured) || !filter_var($configured, FILTER_VALIDATE_EMAIL)) {
            throw ValidationException::withMessages(['email'=>'Configure SBCC_PRIMARY_OWNER_EMAIL on the trusted server first.']);
        }
        if (!hash_equals($configured, $email)) {
            throw ValidationException::withMessages(['email'=>'This account is not the configured Primary Owner.']);
        }
        return $email;
    }

    private function consoleOnly(): void
    {
        abort_unless(app()->runningInConsole(), 403, 'Primary Owner bootstrap requires trusted server CLI access.');
    }

    private function lockRoles(): void
    {
        // Serializes first-owner checks and role writes, including the zero-owner case.
        DB::select('select pg_advisory_xact_lock(1935827811)');
    }

    private function audit(?int $actor, User $target, string $from, string $to, string $source): void
    {
        DB::table('audit_events')->insert([
            'actor_id'=>$actor,'action'=>'account.role-change',
            'detail'=>json_encode(['user_id'=>$target->id,'from'=>$from,'to'=>$to,'source'=>$source],JSON_THROW_ON_ERROR),
            'created_at'=>now(),'updated_at'=>now(),
        ]);
    }

    /** Explicit, allowlisted server-operator recovery/bootstrap; never exposed by a route. */
    public function grantPrimaryOwner(string $email, bool $bootstrap): bool
    {
        $this->consoleOnly();
        $email = $this->primaryEmail($email);
        return DB::transaction(function () use ($email,$bootstrap) {
            $this->lockRoles();
            $matches=User::whereRaw('lower(email) = ?',[$email])->lockForUpdate()->get();
            if ($matches->count() !== 1) {
                throw ValidationException::withMessages(['email'=>'Expected exactly one existing account. No account was modified.']);
            }
            $user=$matches->first();
            if ($user->role === 'owner') return false;
            $hasOwner=User::where('role','owner')->exists();
            if (!$hasOwner && !$bootstrap) {
                throw ValidationException::withMessages(['email'=>'No Owner exists. First-owner promotion requires --bootstrap.']);
            }
            if ($hasOwner && $bootstrap) {
                throw ValidationException::withMessages(['email'=>'An Owner already exists. Do not use --bootstrap for recovery.']);
            }
            $before=$user->role;
            $user->role='owner';
            $user->save();
            $this->audit(null,$user,$before,'owner',$bootstrap?'server-bootstrap':'server-recovery');
            return true;
        });
    }

    public function createPrimaryOwner(string $email, string $password): User
    {
        $this->consoleOnly();
        $email=$this->primaryEmail($email);
        return DB::transaction(function () use ($email,$password) {
            $this->lockRoles();
            if (User::where('role','owner')->exists()) {
                throw ValidationException::withMessages(['email'=>'An Owner already exists; initial account creation is closed.']);
            }
            if (User::whereRaw('lower(email) = ?',[$email])->exists()) {
                throw ValidationException::withMessages(['email'=>'Account exists. Use sbcc:grant-owner to preserve its password and records.']);
            }
            if (strlen($password)<10 || strlen($password)>200) {
                throw ValidationException::withMessages(['password'=>'Password must be 10 to 200 characters.']);
            }
            $user=new User(['email'=>$email,'name'=>'Primary Owner','password'=>Hash::make($password)]);
            $user->role='owner';
            $user->save();
            Workspace::create(['user_id'=>$user->id,'revision'=>0,'data'=>array_fill_keys(['products','orders','customers','expenses','posts','notes'],[])]);
            $this->audit(null,$user,'absent','owner','server-bootstrap-create');
            return $user;
        });
    }

    /** Future trusted server-side callers must supply an authenticated actor, never a request actor ID. */
    public function changeRole(User $actor, User $target, string $role): void
    {
        if (!in_array($role,['admin','customer'],true)) {
            throw ValidationException::withMessages(['role'=>'Only admin or customer may be assigned here. Primary Owner changes require the server CLI.']);
        }
        DB::transaction(function () use ($actor,$target,$role) {
            $this->lockRoles();
            // Re-read authority: a stale session/model must not retain revoked privileges.
            $trustedActor=User::whereKey($actor->id)->lockForUpdate()->firstOrFail();
            Gate::forUser($trustedActor)->authorize('manage-account-roles');
            $account=User::whereKey($target->id)->lockForUpdate()->firstOrFail();
            abort_if($account->isPrimaryOwner(),403,'Primary Owner cannot be demoted through role management.');
            if ($account->role===$role) return;
            $before=$account->role;
            $account->role=$role;
            $account->save();
            $this->audit($trustedActor->id,$account,$before,$role,'primary-owner-authorized');
        });
    }
}
