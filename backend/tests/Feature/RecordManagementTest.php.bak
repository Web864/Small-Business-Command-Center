<?php
namespace Tests\Feature;

use App\Models\{User,Workspace};
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

/**
 * F9 server-side persistence + rules through the real HTTP endpoint.
 * NOT EXECUTED in the authoring sandbox (no vendor/ or PostgreSQL there). Run with: php tests/run-local.php
 * (isolated disposable schema) — never against real business data.
 */
class RecordManagementTest extends TestCase
{
    use DatabaseTransactions;

    private function owner(): User { return User::factory()->create(['role'=>'owner']); }
    private function blank(array $o = []): array { return array_merge(['products'=>[],'orders'=>[],'customers'=>[],'expenses'=>[],'posts'=>[],'notes'=>[]], $o); }
    private function seed(User $u, array $data, int $rev = 0): void { Workspace::create(['user_id'=>$u->id,'revision'=>$rev,'data'=>$data]); }
    private function save(User $u, array $data, int $rev) { return $this->actingAs($u)->putJson('/api/workspace', ['revision'=>$rev,'data'=>$data]); }
    private function product(string $id, string $sku, array $x = []): array { return array_merge(['id'=>$id,'name'=>'P'.$id,'sku'=>$sku,'price'=>10,'cost'=>4,'stock'=>5,'min'=>1], $x); }
    private function order(string $id, string $customer, string $pid, array $x = []): array
    {
        return array_merge(['id'=>$id,'customer'=>$customer,'productId'=>$pid,'qty'=>1,'paid'=>0,'status'=>'New','date'=>'2026-01-01',
            'items'=>[['productId'=>$pid,'name'=>'n','sku'=>'s','qty'=>1,'unitPrice'=>10,'unitCost'=>4]]], $x);
    }

    public function test_archived_flag_persists_server_side_and_survives_reload(): void
    {
        $u = $this->owner();
        $this->seed($u, $this->blank(['products'=>[$this->product('a','A-1')],'orders'=>[$this->order('o1','Jane','a',['paid'=>10])]]));
        $new = $this->blank(['products'=>[$this->product('a','A-1',['archived'=>true])],'orders'=>[$this->order('o1','Jane','a',['paid'=>10])]]);
        $this->save($u, $new, 0)->assertOk()->assertJsonPath('revision', 1);
        $this->actingAs($u)->getJson('/api/workspace')->assertOk()->assertJsonPath('data.products.0.archived', true)->assertJsonPath('data.orders.0.id', 'o1');
    }
    public function test_deleting_a_product_with_orders_is_rejected_with_record_rule_code(): void
    {
        $u = $this->owner();
        $data = $this->blank(['products'=>[$this->product('a','A-1')],'orders'=>[$this->order('o1','Jane','a')]]);
        $this->seed($u, $data);
        $bad = $data; $bad['products'] = [];
        $this->save($u, $bad, 0)->assertStatus(422)->assertJsonPath('code','RECORD_RULE');
        $this->actingAs($u)->getJson('/api/workspace')->assertJsonCount(1,'data.products');
    }
    public function test_paid_order_cannot_be_deleted_but_full_clear_still_works(): void
    {
        $u = $this->owner();
        $data = $this->blank(['products'=>[$this->product('a','A-1')],'orders'=>[$this->order('o1','Jane','a',['paid'=>5])]]);
        $this->seed($u, $data);
        $bad = $data; $bad['orders'] = [];
        $this->save($u, $bad, 0)->assertStatus(422)->assertJsonPath('code','RECORD_RULE');
        $this->save($u, $this->blank(), 0)->assertOk();
    }
    public function test_expense_category_and_post_status_validated_and_legacy_expense_saves(): void
    {
        $u = $this->owner();
        $legacy = $this->blank(['expenses'=>[['id'=>'e1','name'=>'Old','amount'=>5,'date'=>'2026-01-01']]]);
        $this->seed($u, $legacy);
        $ok = $legacy; $ok['expenses'][0]['category'] = 'Rent';
        $this->save($u, $ok, 0)->assertOk();
        $bad = $ok; $bad['expenses'][0]['category'] = 'Gambling';
        $this->save($u, $bad, 1)->assertStatus(422)->assertJsonPath('code','RECORD_RULE');
        $badPost = $ok; $badPost['posts'][] = ['id'=>'s1','platform'=>'TikTok','caption'=>'x','date'=>'2026-01-01','status'=>'Nope'];
        $this->save($u, $badPost, 1)->assertStatus(422);
        $goodPost = $ok; $goodPost['posts'][] = ['id'=>'s1','platform'=>'TikTok','caption'=>'x','date'=>'2026-01-01','status'=>'Draft'];
        $this->save($u, $goodPost, 1)->assertOk();
        $deleted = $goodPost; $deleted['posts'] = []; $deleted['notes'] = [];
        $this->save($u, $deleted, 2)->assertOk();
    }
    public function test_duplicate_sku_including_archived_is_rejected(): void
    {
        $u = $this->owner();
        $this->seed($u, $this->blank(['products'=>[$this->product('a','SKU-1',['archived'=>true])]]));
        $bad = $this->blank(['products'=>[$this->product('a','SKU-1',['archived'=>true]),$this->product('b','sku-1')]]);
        $this->save($u, $bad, 0)->assertStatus(422)->assertJsonPath('code','RECORD_RULE');
    }
    public function test_new_order_for_archived_product_is_rejected(): void
    {
        $u = $this->owner();
        $base = $this->blank(['products'=>[$this->product('a','A',['archived'=>true])]]);
        $this->seed($u, $base);
        $bad = $base; $bad['orders'][] = $this->order('o9','Fresh','a');
        $this->save($u, $bad, 0)->assertStatus(422)->assertJsonPath('code','RECORD_RULE');
    }
    public function test_tenants_cannot_see_or_overwrite_each_others_archived_records(): void
    {
        $a = $this->owner(); $b = $this->owner();
        $this->seed($a, $this->blank(['products'=>[$this->product('a','A',['archived'=>true])]]));
        $this->seed($b, $this->blank(['products'=>[$this->product('b','B')]]));
        $this->actingAs($b)->getJson('/api/workspace')->assertJsonCount(1,'data.products')->assertJsonPath('data.products.0.id','b');
        $this->save($b, $this->blank(['products'=>[$this->product('b','B',['archived'=>true])]]), 0)->assertOk();
        $this->actingAs($a)->getJson('/api/workspace')->assertJsonPath('data.products.0.id','a')->assertJsonPath('data.products.0.archived', true);
    }
    public function test_stale_revision_still_returns_409_before_rules_run(): void
    {
        $u = $this->owner();
        $this->seed($u, $this->blank(), 3);
        $this->save($u, $this->blank(), 1)->assertStatus(409)->assertJsonPath('code','WORKSPACE_CONFLICT');
    }
}
