<?php
namespace Tests\Feature;

use App\Models\{User,Workspace};
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\{Auth,Hash};
use Tests\TestCase;

class OwnerPasswordResetTest extends TestCase
{
    use DatabaseTransactions;
    protected function setUp(): void
    {
        parent::setUp();
        config(['sbcc.primary_owner_email'=>'primary@example.invalid']);
    }
    private function owner(string $role='owner'): User
    {
        return User::factory()->create(['email'=>'primary@example.invalid','role'=>$role])->refresh();
    }
    public function test_local_reset_changes_only_hash_preserves_data_and_can_authenticate(): void
    {
        $this->app['env']='local';
        $user=$this->owner();
        $before=$user->getRawOriginal();
        $data=array_fill_keys(['products','orders','customers','expenses','posts','notes'],[]);
        Workspace::create(['user_id'=>$user->id,'revision'=>5,'data'=>$data]);
        $workspace=Workspace::find($user->id)->getRawOriginal();
        $this->artisan('sbcc:reset-owner-password',['email'=>$user->email])
            ->expectsConfirmation('Reset only the password for this existing Primary Owner account?', 'yes')
            ->expectsQuestion('New password (12 to 72 bytes)','synthetic-new-password-123')
            ->expectsQuestion('Confirm new password','synthetic-new-password-123')
            ->expectsOutput('Password reset complete. Laravel authentication verified. Only the password hash changed.')
            ->assertExitCode(0);
        $after=$user->fresh()->getRawOriginal();
        $this->assertNotSame($before['password'],$after['password']);
        $this->assertTrue(Hash::check('synthetic-new-password-123',$after['password']));
        unset($before['password'],$after['password']);
        $this->assertSame($before,$after);
        $this->assertSame($workspace,Workspace::find($user->id)->getRawOriginal());
        $this->assertTrue($user->fresh()->isPrimaryOwner());
        $this->assertTrue(Auth::validate(['email'=>$user->email,'password'=>'synthetic-new-password-123']));
        $this->assertFalse(Auth::validate(['email'=>$user->email,'password'=>'test-password-123']));
    }
    public function test_cancel_preserves_hash(): void
    {
        $this->app['env']='local';$user=$this->owner();$before=$user->getRawOriginal();
        $this->artisan('sbcc:reset-owner-password',['email'=>$user->email])
            ->expectsConfirmation('Reset only the password for this existing Primary Owner account?','no')->assertExitCode(0);
        $this->assertSame($before,$user->fresh()->getRawOriginal());
    }
    public function test_non_local_environment_and_unattended_execution_are_rejected(): void
    {
        $user=$this->owner();$before=$user->getRawOriginal();
        $this->artisan('sbcc:reset-owner-password',['email'=>$user->email])->assertExitCode(1);
        $this->app['env']='local';
        $this->artisan('sbcc:reset-owner-password',['email'=>$user->email,'--no-interaction'=>true])->assertExitCode(1);
        $this->assertSame($before,$user->fresh()->getRawOriginal());
    }
    public function test_customer_and_unconfigured_email_are_rejected(): void
    {
        $this->app['env']='local';$user=$this->owner('customer');$before=$user->getRawOriginal();
        $this->artisan('sbcc:reset-owner-password',['email'=>$user->email])->assertExitCode(1);
        $this->artisan('sbcc:reset-owner-password',['email'=>'another@example.invalid'])->assertExitCode(1);
        $this->assertSame($before,$user->fresh()->getRawOriginal());
    }
    public function test_missing_account_is_not_created(): void
    {
        $this->app['env']='local';
        $this->artisan('sbcc:reset-owner-password',['email'=>'primary@example.invalid'])->assertExitCode(1);
        $this->assertDatabaseMissing('users',['email'=>'primary@example.invalid']);
    }
    public function test_mismatch_and_short_password_are_rejected(): void
    {
        $this->app['env']='local';$user=$this->owner();$before=$user->getRawOriginal();
        foreach([['synthetic-new-password-123','different-synthetic-password'],['short','short'],[str_repeat('a',73),str_repeat('a',73)]] as [$password,$confirm]) {
            $this->artisan('sbcc:reset-owner-password',['email'=>$user->email])
                ->expectsConfirmation('Reset only the password for this existing Primary Owner account?','yes')
                ->expectsQuestion('New password (12 to 72 bytes)',$password)
                ->expectsQuestion('Confirm new password',$confirm)->assertExitCode(1);
            $this->assertSame($before,$user->fresh()->getRawOriginal());
        }
    }
}
