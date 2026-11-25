<?php
namespace Tests\Feature;

use App\Models\{User,Workspace};
use App\Services\RoleManager;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\{DB,Gate};
use Tests\TestCase;

class OwnerAuthorizationTest extends TestCase
{
    use DatabaseTransactions;
    protected function setUp(): void
    {
        parent::setUp();
        config(['sbcc.primary_owner_email'=>'primary@example.invalid']);
    }
    private function primary(string $role='owner'): User
    {
        return User::factory()->create(['email'=>'primary@example.invalid','role'=>$role])->refresh();
    }
    private function grant(array $options=[])
    {
        return $this->artisan('sbcc:grant-owner',array_merge(['email'=>'primary@example.invalid','--confirm-email'=>'primary@example.invalid'],$options));
    }

    public function test_bootstrap_existing_account_preserves_identity_password_and_business_data_and_is_idempotent(): void
    {
        $user=$this->primary('customer');
        $before=$user->getRawOriginal();
        $data=array_fill_keys(['products','orders','customers','expenses','posts','notes'],[]);
        $data['products']=[['id'=>'synthetic-product','price'=>12]];
        Workspace::create(['user_id'=>$user->id,'revision'=>7,'data'=>$data]);
        DB::table('sbcc_profiles')->insert(['user_id'=>$user->id,'data'=>json_encode(['businessName'=>'Synthetic QA']),'updated_at'=>now()]);
        $this->grant(['--bootstrap'=>true])->assertExitCode(0);
        $user->refresh();
        $this->assertSame('owner',$user->role);
        $this->assertTrue($user->isPrimaryOwner());
        foreach(['id','email','name','password','remember_token','created_at'] as $key) $this->assertSame($before[$key],$user->getRawOriginal($key));
        $this->assertEquals($data,Workspace::find($user->id)->data);
        $this->assertSame(7,Workspace::find($user->id)->revision);
        $this->assertSame('Synthetic QA',json_decode(DB::table('sbcc_profiles')->where('user_id',$user->id)->value('data'),true)['businessName']);
        $updated=$user->getRawOriginal('updated_at');
        $this->grant(['--bootstrap'=>true])->assertExitCode(0);
        $this->grant()->assertExitCode(0);
        $this->assertSame($updated,$user->fresh()->getRawOriginal('updated_at'));
        $this->assertSame(1,DB::table('audit_events')->where('action','account.role-change')->count());
    }

    public function test_first_owner_requires_explicit_bootstrap_and_email_confirmation(): void
    {
        $user=$this->primary('customer');
        $this->grant()->assertExitCode(1);
        $this->artisan('sbcc:grant-owner',['email'=>$user->email,'--bootstrap'=>true])->assertExitCode(1);
        $this->assertSame('customer',$user->fresh()->role);
    }

    public function test_unconfigured_and_non_allowlisted_accounts_cannot_be_promoted(): void
    {
        $user=$this->primary('customer');
        config(['sbcc.primary_owner_email'=>'']);
        $this->grant(['--bootstrap'=>true])->assertExitCode(1);
        config(['sbcc.primary_owner_email'=>'another@example.invalid']);
        $this->grant(['--bootstrap'=>true])->assertExitCode(1);
        $this->assertSame('customer',$user->fresh()->role);
    }

    public function test_recovery_cannot_misuse_first_owner_bootstrap(): void
    {
        $user=$this->primary('customer');
        User::factory()->create(['role'=>'owner']);
        $this->grant(['--bootstrap'=>true])->assertExitCode(1);
        $this->assertSame('customer',$user->fresh()->role);
        $this->grant()->assertExitCode(0);
        $this->assertTrue($user->fresh()->isPrimaryOwner());
    }

    public function test_missing_account_is_not_recreated(): void
    {
        $this->grant(['--bootstrap'=>true])->assertExitCode(1);
        $this->assertDatabaseMissing('users',['email'=>'primary@example.invalid']);
    }

    public function test_legacy_create_owner_is_explicit_and_cannot_replace_existing_accounts(): void
    {
        $this->artisan('sbcc:create-owner',['email'=>'primary@example.invalid'])->assertExitCode(1);
        $user=$this->primary('customer');
        $before=$user->getRawOriginal();
        $this->artisan('sbcc:create-owner',['email'=>$user->email,'--bootstrap'=>true])->assertExitCode(1);
        $this->assertSame($before,$user->fresh()->getRawOriginal());
    }

    public function test_new_first_owner_bootstrap_and_creation_closure(): void
    {
        $this->artisan('sbcc:create-owner',['email'=>'primary@example.invalid','--bootstrap'=>true])
            ->expectsQuestion('Choose a private local password (10 to 200 characters)','synthetic-only-password')
            ->assertExitCode(0);
        $user=User::where('email','primary@example.invalid')->firstOrFail();
        $this->assertTrue($user->isPrimaryOwner());
        $this->assertDatabaseHas('workspaces',['user_id'=>$user->id]);
        config(['sbcc.primary_owner_email'=>'second@example.invalid']);
        $this->artisan('sbcc:create-owner',['email'=>'second@example.invalid','--bootstrap'=>true])->assertExitCode(1);
        $this->assertDatabaseMissing('users',['email'=>'second@example.invalid']);
    }

    public function test_primary_owner_can_assign_admin_and_customer_but_cannot_create_another_owner(): void
    {
        $owner=$this->primary();
        $customer=User::factory()->create();
        $roles=app(RoleManager::class);
        $this->assertTrue(Gate::forUser($owner)->allows('manage-account-roles'));
        $roles->changeRole($owner,$customer,'admin');
        $this->assertSame('admin',$customer->fresh()->role);
        $roles->changeRole($owner,$customer,'customer');
        $this->assertSame('customer',$customer->fresh()->role);
        $this->expectException(\Illuminate\Validation\ValidationException::class);
        $roles->changeRole($owner,$customer,'owner');
    }

    public function test_admin_and_customer_cannot_change_roles_and_admin_retains_license_permissions(): void
    {
        $this->primary();
        $target=User::factory()->create();
        foreach(['admin','customer','owner'] as $role){
            $actor=User::factory()->create(['role'=>$role]);
            $this->assertFalse(Gate::forUser($actor)->allows('manage-account-roles'));
            try {
                app(RoleManager::class)->changeRole($actor,$target,'admin');
                $this->fail('Unauthorized actor changed a role.');
            } catch (AuthorizationException $e) {
                $this->assertSame('customer',$target->fresh()->role);
            }
            $this->actingAs($actor)->getJson('/api/admin/licenses')->assertStatus($role==='customer'?403:200);
            $this->getJson('/api/license/my-role')->assertOk()->assertJsonPath('canManageLicenses',$role!=='customer');
            $this->getJson('/api/workspace')->assertStatus($role==='customer'?403:200);
        }
    }

    public function test_primary_owner_cannot_be_demoted_by_role_service(): void
    {
        $owner=$this->primary();
        try {
            app(RoleManager::class)->changeRole($owner,$owner,'customer');
            $this->fail('Primary Owner demotion allowed.');
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            $this->assertSame(403,$e->getStatusCode());
            $this->assertSame('owner',$owner->fresh()->role);
        }
    }

    public function test_stale_actor_does_not_retain_role_change_authority(): void
    {
        $owner=$this->primary();
        $target=User::factory()->create();
        DB::table('users')->where('id',$owner->id)->update(['role'=>'admin']);
        $this->expectException(AuthorizationException::class);
        app(RoleManager::class)->changeRole($owner,$target,'admin');
    }

    public function test_mass_assignment_registration_and_profile_cannot_promote_customers(): void
    {
        $customer=User::factory()->create();
        $customer->fill(['role'=>'owner']);
        $customer->save();
        $this->assertSame('customer',$customer->fresh()->role);
        $this->postJson('/api/register',['email'=>'untrusted@example.invalid','password'=>'synthetic-only-password','role'=>'owner','isPrimaryOwner'=>true])->assertCreated();
        $this->assertDatabaseHas('users',['email'=>'untrusted@example.invalid','role'=>'customer']);
        $this->actingAs($customer)->putJson('/api/profile',['displayName'=>'QA','businessName'=>'QA','businessType'=>'QA','currency'=>'USD','role'=>'owner'])->assertForbidden();
        $device='11111111-1111-4111-8111-111111111111';
        \App\Models\License::create(['key_digest'=>hash('sha256','synthetic-test-license'),'buyer_email'=>$customer->email,'status'=>'active','claimed_by'=>$customer->id,'installation'=>$device]);
        $this->withHeader('X-SBCC-Installation',$device)->putJson('/api/profile',['displayName'=>'QA','businessName'=>'QA','businessType'=>'QA','currency'=>'USD','role'=>'owner'])->assertOk();
        $this->postJson('/api/users/'.$customer->id.'/role',['role'=>'owner'])->assertNotFound();
        $this->assertSame('customer',$customer->fresh()->role);
    }

    public function test_status_reports_actual_database_role_and_designation(): void
    {
        $this->primary();
        $this->artisan('sbcc:owner-status',['email'=>'primary@example.invalid'])
            ->expectsOutput('Role: owner')->expectsOutput('Primary Owner: yes')->assertExitCode(0);
    }
}
