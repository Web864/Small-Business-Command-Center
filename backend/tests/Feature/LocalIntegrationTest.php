<?php
namespace Tests\Feature;

use App\Models\{User,Workspace};
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\{Auth,DB,Http};
use Tests\TestCase;

class LocalIntegrationTest extends TestCase
{
    use DatabaseTransactions;

    private function owner(): User
    {
        $user=User::factory()->create(['role'=>'owner']);
        Workspace::create(['user_id'=>$user->id,'revision'=>0,'data'=>array_fill_keys(['products','orders','customers','expenses','posts','notes'],[])]);
        return $user;
    }

    public function test_guest_session_is_json_401_even_without_accept_header(): void
    {
        $this->get('/api/session')->assertUnauthorized()->assertJsonStructure(['message']);
    }

    public function test_login_session_restoration_and_logout(): void
    {
        $user=$this->owner();
        $this->postJson('/api/login',['email'=>$user->email,'password'=>'incorrect'])->assertStatus(422);
        $this->postJson('/api/login',['email'=>$user->email,'password'=>'test-password-123'])->assertOk()->assertJsonPath('user.role','owner')->assertJsonStructure(['csrfToken']);
        $this->assertAuthenticatedAs($user);
        $cookie=config('session.cookie');
        $sessionId=session()->getId();
        Auth::forgetGuards();
        $this->withCookie($cookie,$sessionId)->getJson('/api/session')->assertOk()->assertJsonPath('user.id',$user->id);
        $this->postJson('/api/logout')->assertOk()->assertJsonPath('loggedOut',true);
        Auth::forgetGuards();
        $this->getJson('/api/session')->assertUnauthorized();
    }

    public function test_owner_can_load_role_license_profile_and_workspace(): void
    {
        $user=$this->owner();
        $this->actingAs($user)->getJson('/api/license/my-role')->assertOk()->assertJsonPath('canManageLicenses',true);
        $this->getJson('/api/license')->assertOk()->assertJsonPath('status','manager');
        $this->getJson('/api/me')->assertOk()->assertJsonPath('profile.currency','USD');
        $this->putJson('/api/profile',['displayName'=>'','businessName'=>'Synthetic QA','businessType'=>'Handmade products','currency'=>'USD'])->assertOk()->assertJsonPath('profile.displayName','');
        $this->getJson('/api/workspace')->assertOk()->assertJsonPath('revision',0);
    }

    public function test_profile_cannot_bypass_currency_conversion(): void
    {
        $this->actingAs($this->owner())->putJson('/api/profile',['displayName'=>'QA','businessName'=>'Synthetic','businessType'=>'Handmade products','currency'=>'EUR'])->assertStatus(422);
    }

    public function test_image_roundtrip_is_private_and_validated(): void
    {
        $user=$this->owner();
        $png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=';
        $this->actingAs($user)->postJson('/api/avatar',['imageData'=>$png,'contentType'=>'image/png'])->assertOk()->assertJsonPath('url','data:image/png;base64,'.$png);
        $this->getJson('/api/avatar')->assertOk()->assertJsonPath('url','data:image/png;base64,'.$png);
        $this->actingAs($this->owner())->getJson('/api/avatar')->assertOk()->assertJsonPath('url',null);
        $this->actingAs($user)->postJson('/api/logo',['imageData'=>'invalid','contentType'=>'image/png'])->assertStatus(422);
        $this->deleteJson('/api/avatar')->assertOk()->assertJsonPath('url',null);
        $this->getJson('/api/avatar')->assertOk()->assertJsonPath('url',null);
        $this->getJson('/api/product-image/missing')->assertNotFound();
    }

    public function test_quote_conversion_is_atomic_and_preserves_non_money_fields(): void
    {
        $user=$this->owner();
        $workspace=Workspace::find($user->id);
        $data=$workspace->data;
        $data['products']=[['id'=>'qa-p','price'=>10,'cost'=>4,'stock'=>8]];
        $data['orders']=[['id'=>'qa-o','paid'=>12,'discountPercent'=>10,'qty'=>2,'items'=>[['unitPrice'=>10,'unitCost'=>4,'qty'=>2]],'refundHistory'=>[['amount'=>2]]]];
        $workspace->update(['data'=>$data]);
        Http::fake(['api.frankfurter.dev/*'=>Http::response(['rate'=>2,'date'=>'2026-11-24'])]);
        $this->actingAs($user)->getJson('/api/fx/EUR')->assertOk()->assertJsonPath('rate',2);
        $this->postJson('/api/fx/convert',['from'=>'USD','to'=>'EUR','expectedRate'=>2,'revision'=>0])
            ->assertOk()->assertJsonPath('revision',1)->assertJsonPath('profile.currency','EUR')
            ->assertJsonPath('workspace.products.0.price',20)->assertJsonPath('workspace.products.0.stock',8)
            ->assertJsonPath('workspace.orders.0.items.0.unitCost',8)->assertJsonPath('workspace.orders.0.discountPercent',10)
            ->assertJsonPath('workspace.orders.0.refundHistory.0.amount',4);
        $this->postJson('/api/fx/convert',['from'=>'USD','to'=>'EUR','expectedRate'=>2,'revision'=>0])->assertStatus(409);
    }

    public function test_quote_provider_failure_does_not_change_workspace(): void
    {
        $user=$this->owner();
        Http::fake(['*'=>Http::response([],503)]);
        $this->actingAs($user)->getJson('/api/fx/EUR')->assertStatus(503);
        $this->assertSame(0,Workspace::find($user->id)->revision);
    }

    public function test_currency_conversion_rejects_stale_tab(): void
    {
        $user=$this->owner();
        Http::fake(['*'=>Http::response(['rate'=>2,'date'=>'2026-11-24'])]);
        $this->actingAs($user)->getJson('/api/fx/EUR')->assertOk();
        Workspace::where('user_id',$user->id)->update(['revision'=>1]);
        $this->postJson('/api/fx/convert',['from'=>'USD','to'=>'EUR','expectedRate'=>2,'revision'=>0])->assertStatus(409)->assertJsonPath('code','WORKSPACE_CONFLICT');
        $this->assertDatabaseMissing('sbcc_profiles',['user_id'=>$user->id]);
    }

    public function test_registration_cannot_escalate_role_and_customer_cannot_administer(): void
    {
        $email='registration-'.bin2hex(random_bytes(5)).'@example.invalid';
        $this->postJson('/api/register',['email'=>$email,'password'=>'synthetic-password-123','role'=>'owner'])->assertCreated();
        $user=User::where('email',$email)->firstOrFail();
        $this->assertSame('customer',$user->role);
        $this->actingAs($user)->getJson('/api/admin/licenses')->assertForbidden();
    }

    public function test_licenses_can_be_issued_claimed_released_and_revoked(): void
    {
        $owner=$this->owner();
        $buyer=User::factory()->create();
        $issued=$this->actingAs($owner)->postJson('/api/admin/issue',['email'=>$buyer->email])->assertCreated()->json();
        $device='11111111-1111-4111-8111-111111111111';
        $this->actingAs($buyer)->postJson('/api/license/redeem',['key'=>$issued['key'],'installation'=>$device])->assertOk();
        $this->withHeader('X-SBCC-Installation',$device)->getJson('/api/workspace')->assertOk();
        $this->withHeader('X-SBCC-Installation','22222222-2222-4222-8222-222222222222')->getJson('/api/workspace')->assertForbidden()->assertJsonPath('code','DEVICE_MISMATCH');
        $this->postJson('/api/license/release',['installation'=>$device])->assertOk();
        $this->postJson('/api/license/activate',['installation'=>$device])->assertOk();
        $this->actingAs($owner)->postJson('/api/admin/license-action',['id'=>$issued['id'],'action'=>'revoke'])->assertOk();
        $this->actingAs($buyer)->withHeader('X-SBCC-Installation',$device)->getJson('/api/workspace')->assertForbidden()->assertJsonPath('code','LICENSE_REVOKED');
    }

    public function test_csrf_middleware_rejects_unsafe_requests_without_token(): void
    {
        // Exercise actual web middleware instead of Laravel's testing CSRF bypass.
        $this->app['env']='local';
        $this->postJson('/api/login',['email'=>'qa@example.invalid','password'=>'synthetic'])->assertStatus(419);
        $this->getJson('/api/csrf')->assertOk()->assertJsonStructure(['csrfToken'])->assertCookie(config('session.cookie'));
    }

    public function test_real_csrf_cookie_login_rotation_restoration_and_logout(): void
    {
        $user=$this->owner();
        $this->app['env']='local';
        $token=$this->getJson('/api/csrf')->assertOk()->json('csrfToken');
        $before=session()->getId();
        $login=$this->withCookie(config('session.cookie'),$before)->withHeader('X-CSRF-TOKEN',$token)
            ->postJson('/api/login',['email'=>$user->email,'password'=>'test-password-123'])->assertOk();
        $this->assertNotSame($before,session()->getId());
        Auth::forgetGuards();
        $this->withCookie(config('session.cookie'),session()->getId())->getJson('/api/session')->assertOk()->assertJsonPath('user.id',$user->id);
        $this->withHeader('X-CSRF-TOKEN',$login->json('csrfToken'))->postJson('/api/logout')->assertOk();
        Auth::forgetGuards();
        $this->getJson('/api/session')->assertUnauthorized();
    }

    public function test_workspace_and_product_media_are_scoped_to_account(): void
    {
        $first=$this->owner();
        $second=$this->owner();
        $data=Workspace::find($first->id)->data;
        $data['products']=[['id'=>'private-product','price'=>10]];
        $this->actingAs($first)->putJson('/api/workspace',['revision'=>0,'data'=>$data])->assertOk();
        $png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=';
        $this->postJson('/api/product-image/private-product',['imageData'=>$png,'contentType'=>'image/png'])->assertOk();
        $this->getJson('/api/product-image/private-product')->assertOk()->assertJsonPath('url','data:image/png;base64,'.$png);
        $this->actingAs($second)->getJson('/api/workspace')->assertOk()->assertJsonPath('data.products',[])->assertJsonPath('revision',0);
        $this->getJson('/api/product-image/private-product')->assertNotFound();
    }
}
