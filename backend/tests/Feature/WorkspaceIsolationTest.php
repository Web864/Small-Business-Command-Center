<?php
namespace Tests\Feature;
use App\Models\{User,Workspace};
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;
class WorkspaceIsolationTest extends TestCase {
 use DatabaseTransactions;
 public function test_customer_needs_license():void {
  $u=User::factory()->create(['role'=>'customer']);
  $this->actingAs($u)->getJson('/api/workspace')->assertStatus(403)->assertJsonPath('code','LICENSE_REQUIRED');
 }
 public function test_owner_stale_save_gets_409_and_cannot_overwrite():void {
  $u=User::factory()->create(['role'=>'owner']);
  $payload=['products'=>[],'orders'=>[],'customers'=>[],'expenses'=>[],'posts'=>[],'notes'=>[]];
  Workspace::create(['user_id'=>$u->id,'revision'=>0,'data'=>$payload]);
  $this->actingAs($u)->postJson('/api/workspace',['revision'=>0,'data'=>$payload])->assertOk()->assertJsonPath('revision',1);
  $this->actingAs($u)->postJson('/api/workspace',['revision'=>0,'data'=>$payload])->assertStatus(409)->assertJsonPath('code','WORKSPACE_CONFLICT');
 }
}
