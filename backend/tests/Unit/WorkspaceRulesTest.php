<?php
namespace Tests\Unit;

use App\Support\WorkspaceRules as R;
use PHPUnit\Framework\TestCase;

/** Pure rule tests (no database, no framework boot). */
class WorkspaceRulesTest extends TestCase
{
    private function ws(array $o = []): array
    {
        return array_merge(['products'=>[],'orders'=>[],'customers'=>[],'expenses'=>[],'posts'=>[],'notes'=>[]], $o);
    }
    private function product(string $id, string $sku, array $x = []): array { return array_merge(['id'=>$id,'name'=>'P'.$id,'sku'=>$sku,'price'=>10,'cost'=>4,'stock'=>5,'min'=>1], $x); }
    private function order(string $id, string $customer, array $productIds, array $x = []): array
    {
        return array_merge(['id'=>$id,'customer'=>$customer,'productId'=>$productIds[0],'qty'=>1,'paid'=>0,'status'=>'New','date'=>'2026-01-01',
            'items'=>array_map(fn($p)=>['productId'=>$p,'name'=>'n','sku'=>'s','qty'=>1,'unitPrice'=>10,'unitCost'=>4], $productIds)], $x);
    }

    public function test_archiving_a_product_is_allowed_and_keeps_history(): void
    {
        $old = $this->ws(['products'=>[$this->product('a','A-1')],'orders'=>[$this->order('o1','Jane',['a'],['paid'=>10])]]);
        $new = $old; $new['products'][0]['archived'] = true;
        $this->assertNull(R::validate($new, $old));
        $new['products'][0]['archived'] = false; // only true or omitted is valid
        $this->assertStringContainsString('archived flag', (string)R::validate($new, $old));
    }
    public function test_product_with_orders_cannot_be_deleted_but_unused_one_can(): void
    {
        $old = $this->ws(['products'=>[$this->product('a','A-1'),$this->product('b','B-1')],'orders'=>[$this->order('o1','Jane',['a'])]]);
        $deleteUsed = $old; $deleteUsed['products'] = [$this->product('b','B-1')];
        $this->assertStringContainsString('Archive it instead', (string)R::validate($deleteUsed, $old));
        $deleteUnused = $old; $deleteUnused['products'] = [$this->product('a','A-1')];
        $this->assertNull(R::validate($deleteUnused, $old));
    }
    public function test_customer_with_orders_cannot_be_deleted_name_match_is_case_insensitive(): void
    {
        $old = $this->ws(['customers'=>[['id'=>'c1','name'=>'Jane Doe']],'products'=>[$this->product('a','A')],'orders'=>[$this->order('o1','jane doe',['a'])]]);
        $new = $old; $new['customers'] = [];
        $this->assertStringContainsString('Archive them instead', (string)R::validate($new, $old));
        $new['customers'] = [['id'=>'c1','name'=>'Jane Doe','archived'=>true]];
        $this->assertNull(R::validate($new, $old));
    }
    public function test_sku_stays_reserved_including_archived_products(): void
    {
        $old = $this->ws(['products'=>[$this->product('a','SKU-1',['archived'=>true])]]);
        $new = $old; $new['products'][] = $this->product('b','sku-1');
        $this->assertStringContainsString('already used', (string)R::validate($new, $old));
        $new['products'][1]['sku'] = 'SKU-2';
        $this->assertNull(R::validate($new, $old));
    }
    public function test_legacy_duplicate_sku_does_not_block_untouched_rows(): void
    {
        $dups = $this->ws(['products'=>[$this->product('a','X'),$this->product('b','x')]]);
        $edit = $dups; $edit['notes'][] = ['id'=>'n1','title'=>'t','body'=>'b'];
        $this->assertNull(R::validate($edit, $dups));
    }
    public function test_new_orders_cannot_use_archived_product_or_customer_but_existing_orders_can_be_edited(): void
    {
        $old = $this->ws(['products'=>[$this->product('a','A',['archived'=>true]),$this->product('b','B')],
            'customers'=>[['id'=>'c1','name'=>'Old Client','archived'=>true]],
            'orders'=>[$this->order('o1','Old Client',['a'])]]);
        // editing the historic order (change status) is fine
        $edit = $old; $edit['orders'][0]['status'] = 'Completed';
        $this->assertNull(R::validate($edit, $old));
        // new order with archived product
        $bad = $old; $bad['orders'][] = $this->order('o2','Fresh',['a']);
        $this->assertStringContainsString('archived product', (string)R::validate($bad, $old));
        // new order for archived customer
        $bad2 = $old; $bad2['orders'][] = $this->order('o3','old client',['b']);
        $this->assertStringContainsString('archived customer', (string)R::validate($bad2, $old));
        // adding a different archived product to the existing order is rejected too
        $bad3 = $old; $bad3['products'][] = $this->product('c','C',['archived'=>true]); $bad3['orders'][0] = $this->order('o1','Old Client',['a','c']);
        $this->assertStringContainsString('archived product', (string)R::validate($bad3, $old));
        // normal new order is fine
        $ok = $old; $ok['orders'][] = $this->order('o4','Fresh',['b']);
        $this->assertNull(R::validate($ok, $old));
    }
    public function test_expense_category_must_be_in_list_and_legacy_rows_without_category_still_save(): void
    {
        $old = $this->ws(['expenses'=>[['id'=>'e1','name'=>'Old','amount'=>5,'date'=>'2026-01-01']]]);
        $this->assertNull(R::validate($old, $old));
        $edit = $old; $edit['expenses'][0]['category'] = 'Rent';
        $this->assertNull(R::validate($edit, $old));
        $edit['expenses'][0]['category'] = 'Gambling';
        $this->assertStringContainsString('Expense category', (string)R::validate($edit, $old));
        $edit['expenses'][0]['category'] = ['Rent'];
        $this->assertStringContainsString('Expense category', (string)R::validate($edit, $old));
        $neg = $old; $neg['expenses'][0]['amount'] = -3;
        $this->assertStringContainsString('non-negative', (string)R::validate($neg, $old));
        foreach (R::EXPENSE_CATEGORIES as $c) { $ok = $old; $ok['expenses'][0]['category'] = $c; $this->assertNull(R::validate($ok, $old), $c); }
    }
    public function test_post_status_and_platform_validated_only_when_changed(): void
    {
        $old = $this->ws(['posts'=>[['id'=>'s1','platform'=>'LegacyNet','caption'=>'c','date'=>'2026-01-01','status'=>'Old']]]);
        $this->assertNull(R::validate($old, $old), 'untouched legacy post must not block');
        $edit = $old; $edit['posts'][0]['caption'] = 'edited';
        $this->assertNotNull(R::validate($edit, $old), 'edited post must now be valid');
        $edit['posts'][0]['platform'] = 'TikTok'; $edit['posts'][0]['status'] = 'Planned';
        $this->assertNull(R::validate($edit, $old));
        $new = $old; $new['posts'][] = ['id'=>'s2','platform'=>'TikTok','caption'=>'x','date'=>'2026-01-02','status'=>'Hacked'];
        $this->assertStringContainsString('Post status', (string)R::validate($new, $old));
    }
    public function test_post_note_and_expense_deletion_are_allowed(): void
    {
        $old = $this->ws(['posts'=>[['id'=>'s1','platform'=>'TikTok','caption'=>'c','date'=>'2026-01-01','status'=>'Draft']],
            'notes'=>[['id'=>'n1','title'=>'t','body'=>'b']],'expenses'=>[['id'=>'e1','name'=>'x','amount'=>1,'date'=>'2026-01-01']]]);
        $this->assertNull(R::validate($this->ws(), $old));
    }
    public function test_paid_or_refunded_orders_cannot_be_deleted_unless_workspace_fully_reset(): void
    {
        $paid = $this->order('o1','Jane',['a'],['paid'=>5]);
        $refunded = $this->order('o2','Jane',['a'],['status'=>'Cancelled','refundHistory'=>[['id'=>'r','amount'=>1]]]);
        $free = $this->order('o3','Jane',['a']);
        $old = $this->ws(['products'=>[$this->product('a','A')],'orders'=>[$paid,$refunded,$free]]);
        $dropPaid = $old; $dropPaid['orders'] = [$refunded,$free];
        $this->assertStringContainsString('cannot be deleted', (string)R::validate($dropPaid, $old));
        $dropRefunded = $old; $dropRefunded['orders'] = [$paid,$free];
        $this->assertStringContainsString('cannot be deleted', (string)R::validate($dropRefunded, $old));
        $dropFree = $old; $dropFree['orders'] = [$paid,$refunded];
        $this->assertNull(R::validate($dropFree, $old));
        $this->assertNull(R::validate($this->ws(), $old), 'explicit "Clear all records" (everything empty) stays possible');
    }
    public function test_legacy_single_product_orders_are_protected_too(): void
    {
        $legacy = ['id'=>'o1','customer'=>'Z','productId'=>'a','qty'=>1,'paid'=>0,'status'=>'New','date'=>'2026-01-01'];
        $old = $this->ws(['products'=>[$this->product('a','A')],'orders'=>[$legacy]]);
        $new = $old; $new['products'] = [];
        $this->assertStringContainsString('Archive it instead', (string)R::validate($new, $old));
    }
}
