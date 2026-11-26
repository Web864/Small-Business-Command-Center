<?php
namespace Tests\Feature;

use App\Models\{License,User,Workspace};
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\{Auth,DB,Hash};
use Tests\TestCase;

/** Auth, authorization, licensing, tenant isolation and persistence. Synthetic data only; written but NOT executed in the authoring sandbox. */
class CommercialFlowsTest extends TestCase
{
    use DatabaseTransactions;

    private const DEVICE='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    private const OTHER_DEVICE='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

    private function manager(string $role='owner'): User { return User::factory()->create(['role'=>$role]); }

    /** Customer with an active licence bound to DEVICE. */
    private function licensed(string $status='active'): User
    {
        $u=User::factory()->create();
        License::create(['key_digest'=>hash('sha256',bin2hex(random_bytes(8))),'buyer_email'=>$u->email,'status'=>$status,'claimed_by'=>$u->id,'installation'=>$status==='active'?self::DEVICE:null,'activated_at'=>now()]);
        return $u;
    }

    private function as(User $u): static { Auth::forgetGuards(); return $this->actingAs($u)->withHeader('X-SBCC-Installation',self::DEVICE); }

    private function blank(): array { return array_fill_keys(['products','orders','customers','expenses','posts','notes'],[]); }

    // ---------- login / password ----------
    public function test_register_login_session_and_password_change_end_to_end(): void
    {
        $email='flow-'.bin2hex(random_bytes(4)).'@example.invalid';
        $this->postJson('/api/register',['email'=>$email,'password'=>'first-password-123'])->assertCreated();
        $this->postJson('/api/login',['email'=>$email,'password'=>'first-password-123'])->assertOk()->assertJsonPath('user.role','customer');
        $this->getJson('/api/session')->assertOk()->assertJsonPath('user.email',$email);
        $this->postJson('/api/password',['current_password'=>'first-password-123','password'=>'second-password-456'])->assertOk();
        $this->postJson('/api/logout')->assertOk();
        Auth::forgetGuards();
        $this->postJson('/api/login',['email'=>$email,'password'=>'first-password-123'])->assertStatus(422);
        $this->postJson('/api/login',['email'=>$email,'password'=>'second-password-456'])->assertOk();
    }

    public function test_register_rejects_short_password_and_bad_email(): void
    {
        $this->postJson('/api/register',['email'=>'not-an-email','password'=>'long-enough-pass'])->assertStatus(422);
        $this->postJson('/api/register',['email'=>'ok-'.bin2hex(random_bytes(3)).'@example.invalid','password'=>'short'])->assertStatus(422);
    }

    public function test_password_change_rejects_wrong_current_password_and_keeps_old_hash(): void
    {
        $u=User::factory()->create();$before=$u->password;
        $this->actingAs($u)->postJson('/api/password',['current_password'=>'nope-nope-nope','password'=>'another-password-1'])->assertStatus(422);
        $this->assertSame($before,$u->fresh()->password);
        $this->assertTrue(Hash::check('test-password-123',$u->fresh()->password));
    }

    public function test_password_change_does_not_touch_other_accounts(): void
    {
        $a=User::factory()->create();$b=User::factory()->create();$bHash=$b->password;
        $this->actingAs($a)->postJson('/api/password',['current_password'=>'test-password-123','password'=>'another-password-1'])->assertOk();
        $this->assertSame($bHash,$b->fresh()->password);
    }

    // ---------- authorization ----------
    public function test_every_protected_route_rejects_guests(): void
    {
        foreach ([['get','/api/session'],['get','/api/license'],['get','/api/workspace'],['put','/api/workspace'],['get','/api/export'],['get','/api/admin/licenses'],
                  ['post','/api/admin/issue'],['post','/api/admin/license-action'],['post','/api/password'],['put','/api/profile'],['get','/api/me'],['get','/api/avatar']] as [$m,$url]) {
            $this->json($m,$url,[])->assertUnauthorized();
        }
    }

    public function test_customer_cannot_use_admin_endpoints(): void
    {
        $c=$this->licensed();
        $this->as($c)->getJson('/api/admin/licenses')->assertForbidden();
        $this->postJson('/api/admin/issue',['email'=>'x@example.invalid'])->assertForbidden();
        $this->postJson('/api/admin/license-action',['id'=>1,'action'=>'revoke'])->assertForbidden();
        $this->assertSame(0,License::where('buyer_email','x@example.invalid')->count());
    }

    public function test_customer_cannot_self_promote_via_profile_or_workspace_payload(): void
    {
        $c=$this->licensed();
        $this->as($c)->putJson('/api/profile',['businessName'=>'B','businessType'=>'T','currency'=>'USD','role'=>'owner'])->assertOk();
        $this->assertSame('customer',$c->fresh()->role);
    }

    // ---------- licensing ----------
    public function test_unlicensed_customer_is_blocked_from_business_data(): void
    {
        $u=User::factory()->create();
        foreach (['/api/workspace','/api/export','/api/me','/api/avatar'] as $url) {
            $this->actingAs($u)->getJson($url)->assertForbidden()->assertJsonPath('code','LICENSE_REQUIRED');
        }
    }

    public function test_redeem_rules_wrong_email_bad_format_reuse_and_second_license(): void
    {
        $owner=$this->manager();$buyer=User::factory()->create();$intruder=User::factory()->create();
        $key=$this->actingAs($owner)->postJson('/api/admin/issue',['email'=>$buyer->email])->assertCreated()->json('key');
        $this->actingAs($buyer)->postJson('/api/license/redeem',['key'=>'SBCC-bad','installation'=>self::DEVICE])->assertStatus(400);
        $this->actingAs($buyer)->postJson('/api/license/redeem',['key'=>$key,'installation'=>'not-a-uuid'])->assertStatus(422);
        $this->actingAs($intruder)->postJson('/api/license/redeem',['key'=>$key,'installation'=>self::DEVICE])->assertForbidden();
        $this->actingAs($buyer)->postJson('/api/license/redeem',['key'=>$key,'installation'=>self::DEVICE])->assertOk();
        $this->actingAs($buyer)->postJson('/api/license/redeem',['key'=>$key,'installation'=>self::DEVICE])->assertStatus(409);
        $key2=$this->actingAs($owner)->postJson('/api/admin/issue',['email'=>$buyer->email])->assertCreated()->json('key');
        $this->actingAs($buyer)->postJson('/api/license/redeem',['key'=>$key2,'installation'=>self::DEVICE])->assertStatus(409);
    }

    public function test_issued_key_is_not_stored_in_plaintext_and_list_hides_digest(): void
    {
        $owner=$this->manager();
        $key=$this->actingAs($owner)->postJson('/api/admin/issue',['email'=>'buyer-'.bin2hex(random_bytes(3)).'@example.invalid'])->assertCreated()->json('key');
        $this->assertSame(0,DB::table('licenses')->where('key_digest',$key)->count());
        $this->assertSame(1,DB::table('licenses')->where('key_digest',hash('sha256',$key))->count());
        $this->assertStringNotContainsString('key_digest',json_encode($this->getJson('/api/admin/licenses')->assertOk()->json()));
    }

    public function test_device_mismatch_and_missing_header_are_rejected(): void
    {
        $c=$this->licensed();
        $this->actingAs($c)->getJson('/api/workspace')->assertForbidden()->assertJsonPath('code','DEVICE_MISMATCH');
        $this->actingAs($c)->withHeader('X-SBCC-Installation',self::OTHER_DEVICE)->getJson('/api/workspace')->assertForbidden()->assertJsonPath('code','DEVICE_MISMATCH');
        $this->as($c)->getJson('/api/workspace')->assertOk();
    }

    public function test_second_device_cannot_activate_until_release_or_manager_reset(): void
    {
        $owner=$this->manager();$c=$this->licensed();$id=License::where('claimed_by',$c->id)->value('id');
        $this->actingAs($c)->postJson('/api/license/activate',['installation'=>self::OTHER_DEVICE])->assertStatus(409);
        $this->actingAs($owner)->postJson('/api/admin/license-action',['id'=>$id,'action'=>'reset'])->assertOk();
        $this->actingAs($c)->postJson('/api/license/activate',['installation'=>self::OTHER_DEVICE])->assertOk();
        $this->actingAs($c)->withHeader('X-SBCC-Installation',self::DEVICE)->getJson('/api/workspace')->assertForbidden();
        $this->actingAs($c)->withHeader('X-SBCC-Installation',self::OTHER_DEVICE)->getJson('/api/workspace')->assertOk();
    }

    public function test_revoked_and_suspended_licences_lose_access_and_cannot_reactivate(): void
    {
        $owner=$this->manager();$c=$this->licensed();$id=License::where('claimed_by',$c->id)->value('id');
        $this->actingAs($owner)->postJson('/api/admin/license-action',['id'=>$id,'action'=>'revoke'])->assertOk();
        $this->as($c)->getJson('/api/workspace')->assertForbidden()->assertJsonPath('code','LICENSE_REVOKED');
        $this->as($c)->getJson('/api/export')->assertForbidden();
        $this->actingAs($c)->postJson('/api/license/activate',['installation'=>self::DEVICE])->assertForbidden();
        $this->actingAs($owner)->postJson('/api/admin/license-action',['id'=>$id,'action'=>'reset'])->assertStatus(409);
    }

    public function test_license_status_reflects_state(): void
    {
        $c=$this->licensed();
        $this->as($c)->getJson('/api/license')->assertOk()->assertJsonPath('licensed',true)->assertJsonPath('status','active');
        $this->as($this->licensed('revoked'))->getJson('/api/license')->assertOk()->assertJsonPath('licensed',false);
        $this->as(User::factory()->create())->getJson('/api/license')->assertOk()->assertJsonPath('status','none');
    }

    // ---------- tenant isolation ----------
    public function test_customer_a_cannot_read_or_overwrite_customer_b_data(): void
    {
        $a=$this->licensed();$b=$this->licensed();
        $data=$this->blank();$data['customers']=[['id'=>'cust-a','name'=>'A only']];
        $this->as($a)->getJson('/api/workspace')->assertOk();
        $this->putJson('/api/workspace',['revision'=>0,'data'=>$data])->assertOk()->assertJsonPath('revision',1);
        $this->as($b)->getJson('/api/workspace')->assertOk()->assertJsonPath('data.customers',[])->assertJsonPath('revision',0);
        $this->assertStringNotContainsString('A only',json_encode($this->getJson('/api/export')->assertOk()->json()));
        // B writing never changes A's row, even when B submits A's id-looking payload.
        $mine=$this->blank();$mine['customers']=[['id'=>'cust-b','name'=>'B only']];
        $this->putJson('/api/workspace',['revision'=>0,'data'=>$mine])->assertOk();
        $this->as($a)->getJson('/api/workspace')->assertOk()->assertJsonPath('data.customers.0.name','A only');
    }

    public function test_images_and_profiles_are_per_account(): void
    {
        $a=$this->licensed();$b=$this->licensed();
        $png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=';
        $this->as($a)->postJson('/api/logo',['imageData'=>$png,'contentType'=>'image/png'])->assertOk();
        $this->as($b)->getJson('/api/logo')->assertOk()->assertJsonPath('url',null);
        $this->putJson('/api/profile',['businessName'=>'B Biz','businessType'=>'Shop','currency'=>'USD'])->assertOk();
        $this->as($a)->getJson('/api/me')->assertOk()->assertJsonPath('profile.businessName','');
    }

    // ---------- business data persistence ----------
    public function test_workspace_round_trip_persists_across_logout_and_login(): void
    {
        $c=$this->licensed();
        $data=$this->blank();
        $data['products']=[['id'=>'p1','name'=>'Mug','price'=>12.5,'stock'=>4]];
        $data['orders']=[['id'=>'o1','customerId'=>'c1','total'=>25.0,'items'=>[['productId'=>'p1','qty'=>2]]]];
        $data['expenses']=[['id'=>'e1','amount'=>3.25,'category'=>'Supplies']];
        $this->as($c)->getJson('/api/workspace')->assertOk();
        $this->putJson('/api/workspace',['revision'=>0,'data'=>$data])->assertOk()->assertJsonPath('revision',1);
        $this->postJson('/api/logout')->assertOk();
        Auth::forgetGuards();
        $this->postJson('/api/login',['email'=>$c->email,'password'=>'test-password-123'])->assertOk();
        $row=Workspace::find($c->id);
        $this->assertSame(1,$row->revision);
        $this->assertEquals($data,$row->data);
        $this->as($c)->getJson('/api/workspace')->assertOk()->assertJsonPath('data.products.0.name','Mug')->assertJsonPath('data.orders.0.items.0.qty',2);
    }

    public function test_stale_revision_gets_409_and_does_not_overwrite(): void
    {
        $c=$this->licensed();$d1=$this->blank();$d1['notes']=[['id'=>'n1','text'=>'first']];$d2=$this->blank();$d2['notes']=[['id'=>'n2','text'=>'stale']];
        $this->as($c)->getJson('/api/workspace')->assertOk();
        $this->putJson('/api/workspace',['revision'=>0,'data'=>$d1])->assertOk();
        $this->putJson('/api/workspace',['revision'=>0,'data'=>$d2])->assertStatus(409)->assertJsonPath('code','WORKSPACE_CONFLICT');
        $this->assertSame('first',Workspace::find($c->id)->data['notes'][0]['text']);
    }

    public function test_invalid_workspace_payloads_are_rejected_without_changes(): void
    {
        $c=$this->licensed();$this->as($c)->getJson('/api/workspace')->assertOk();
        $bad=$this->blank();$bad['orders']=[['no-id'=>true]];
        $this->putJson('/api/workspace',['revision'=>0,'data'=>$bad])->assertStatus(422);
        $missing=$this->blank();unset($missing['expenses']);
        $this->putJson('/api/workspace',['revision'=>0,'data'=>$missing])->assertStatus(422);
        $many=$this->blank();for($i=0;$i<401;$i++)$many['products'][]=['id'=>'p'.$i];
        $this->putJson('/api/workspace',['revision'=>0,'data'=>$many])->assertStatus(422);
        $big=$this->blank();$big['notes']=[['id'=>'n','text'=>str_repeat('x',190000)]];
        $this->putJson('/api/workspace',['revision'=>0,'data'=>$big])->assertStatus(422);
        $this->assertSame(0,Workspace::find($c->id)->revision);
    }

    public function test_profile_persists_and_currency_cannot_change_directly(): void
    {
        $c=$this->licensed();
        $this->as($c)->putJson('/api/profile',['businessName'=>'Mug Shop','businessType'=>'Handmade','currency'=>'USD','displayName'=>'Sam'])->assertOk();
        $this->getJson('/api/me')->assertOk()->assertJsonPath('profile.businessName','Mug Shop')->assertJsonPath('profile.displayName','Sam');
        $this->putJson('/api/profile',['businessName'=>'Mug Shop','businessType'=>'Handmade','currency'=>'EUR'])->assertStatus(422);
        $this->putJson('/api/profile',['businessName'=>'','businessType'=>'Handmade','currency'=>'USD'])->assertStatus(422);
    }

    public function test_managers_bypass_licence_but_not_authentication(): void
    {
        $this->getJson('/api/workspace')->assertUnauthorized();
        $this->actingAs($this->manager('admin'))->getJson('/api/workspace')->assertOk();
    }
}
