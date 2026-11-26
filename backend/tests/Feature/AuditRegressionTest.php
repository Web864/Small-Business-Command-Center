<?php
namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/** Regression tests for fixes made in the audit/fixes branch. Synthetic accounts only. */
class AuditRegressionTest extends TestCase
{
    use DatabaseTransactions;

    public function test_register_normalizes_email_case_and_rejects_case_variant_duplicates_without_500(): void
    {
        $base='case-'.bin2hex(random_bytes(4)).'@example.invalid';
        $this->postJson('/api/register',['email'=>strtoupper($base),'password'=>'synthetic-password-123'])->assertCreated();
        $this->assertSame(1,User::where('email',$base)->count());
        $this->postJson('/api/register',['email'=>$base,'password'=>'synthetic-password-123'])->assertStatus(422);
        $this->postJson('/api/register',['email'=>ucfirst($base),'password'=>'synthetic-password-123'])->assertStatus(422);
    }

    public function test_password_change_requires_current_password_and_new_password_works(): void
    {
        $user=User::factory()->create();
        $this->actingAs($user)->postJson('/api/password',['current_password'=>'wrong-password-1','password'=>'brand-new-password-1'])->assertStatus(422);
        $this->postJson('/api/password',['current_password'=>'test-password-123','password'=>'test-password-123'])->assertStatus(422);
        $this->postJson('/api/password',['current_password'=>'test-password-123','password'=>'short'])->assertStatus(422);
        $this->postJson('/api/password',['current_password'=>'test-password-123','password'=>'brand-new-password-1'])->assertOk()->assertJsonPath('changed',true);
        $this->assertTrue(\Illuminate\Support\Facades\Hash::check('brand-new-password-1',$user->fresh()->password));
        $this->assertSame(1,DB::table('audit_events')->where('action','account.password-change')->where('actor_id',$user->id)->count());
    }

    public function test_password_change_requires_authentication(): void
    {
        $this->postJson('/api/password',['current_password'=>'x','password'=>'brand-new-password-1'])->assertUnauthorized();
    }

    public function test_login_page_is_available_outside_local_environment_and_has_no_local_only_wording(): void
    {
        $this->app['env']='production';
        $this->get('/login')->assertOk();
        $this->get('/local-login')->assertOk();
        $this->assertStringNotContainsString('no production credentials',file_get_contents(public_path('local-login.html')));
    }

    public function test_responses_carry_baseline_security_headers(): void
    {
        $this->getJson('/api/csrf')->assertOk()
            ->assertHeader('X-Content-Type-Options','nosniff')
            ->assertHeader('X-Frame-Options','DENY')
            ->assertHeader('Referrer-Policy','strict-origin-when-cross-origin');
    }

    public function test_root_does_not_serve_legacy_prototype_when_spa_missing_in_production(): void
    {
        if (is_file(public_path('spa/index.html'))) $this->markTestSkipped('SPA build present.');
        $this->app['env']='production';
        $this->get('/')->assertStatus(503);
    }
}
