<?php
namespace App\Http\Controllers;
use App\Models\{User,Workspace,License};
use Illuminate\Http\{Request,JsonResponse};
use Illuminate\Support\Facades\{Auth,DB,Hash};
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SbccController extends Controller {
 private const COLLECTIONS=['products','orders','customers','expenses','posts','notes'];
 private function fail(string $message,int $status=400,?string $code=null):JsonResponse {
  $data=['error'=>$message];if($code!==null)$data['code']=$code;return response()->json($data,$status);
 }
 private function installation(Request $r):string {
  return (string)($r->header('X-SBCC-Installation')??'');
 }
 private function blank():array {return array_fill_keys(self::COLLECTIONS,[]);}
 private function workspaceFor(User $user):Workspace {
  try{return Workspace::firstOrCreate(['user_id'=>$user->id],['revision'=>0,'data'=>$this->blank()]);}
  catch(\Illuminate\Database\QueryException $e){ // concurrent first request created it; PK conflict is benign
   $existing=Workspace::where('user_id',$user->id)->first();if($existing)return $existing;throw $e;
  }
 }
 protected function licensed(Request $r):?JsonResponse {
  $user=$r->user();if($user->isManager())return null;
  $license=License::where('claimed_by',$user->id)->first();
  if(!$license)return $this->fail('A purchased license is required.',403,'LICENSE_REQUIRED');
  if($license->status!=='active')return $this->fail('This license has been revoked or suspended.',403,'LICENSE_REVOKED');
  if(!preg_match('/^[a-f0-9-]{36}$/i',$this->installation($r)) || !hash_equals((string)$license->installation,$this->installation($r)))
   return $this->fail('This license is active on another installation. Release or reset the existing installation.',403,'DEVICE_MISMATCH');
  return null;
 }
 private function audit(?User $actor,string $event,array $detail=[]):void {
  DB::table('audit_events')->insert(['actor_id'=>$actor?->id,'action'=>$event,'detail'=>json_encode($detail),'created_at'=>now(),'updated_at'=>now()]);
 }
 public function register(Request $r):JsonResponse {
  // Normalize BEFORE the uniqueness check: stored emails are lowercase, so 'A@x.com' must collide with 'a@x.com'.
  if(is_string($r->input('email')))$r->merge(['email'=>strtolower(trim($r->input('email')))]);
  $data=$r->validate(['email'=>'required|email|max:254|unique:users,email','password'=>'required|string|min:10|max:200']);
  $user=User::create(['email'=>strtolower(trim($data['email'])),'name'=>'','password'=>Hash::make($data['password'])]);
  $this->workspaceFor($user); return response()->json(['registered'=>true],201);
 }
 public function login(Request $r):JsonResponse {
  $data=$r->validate(['email'=>'required|email','password'=>'required|string']);
  if(!Auth::attempt(['email'=>strtolower(trim($data['email'])),'password'=>$data['password']]))return $this->fail('Invalid email or password.',422);
  $r->session()->regenerate();return response()->json(['user'=>$this->publicUser($r->user()),'csrfToken'=>$r->session()->token()]);
 }
 public function changePassword(Request $r):JsonResponse {
  $data=$r->validate(['current_password'=>'required|string|max:200','password'=>'required|string|min:10|max:200|different:current_password']);
  $user=$r->user();
  if(!Hash::check($data['current_password'],$user->password))return $this->fail('Current password is incorrect.',422);
  $user->password=$data['password']; // 'hashed' cast
  $user->save();
  $r->session()->regenerate();
  $this->audit($user,'account.password-change');
  return response()->json(['changed'=>true]);
 }
 public function logout(Request $r):JsonResponse {Auth::logout();$r->session()->invalidate();$r->session()->regenerateToken();return response()->json(['loggedOut'=>true]);}
 private function publicUser(User $u):array{return ['id'=>$u->id,'email'=>$u->email,'name'=>$u->name,'role'=>$u->role];}
 public function session(Request $r):JsonResponse {return response()->json(['user'=>$this->publicUser($r->user())]);}
 public function licenseStatus(Request $r):JsonResponse {
  if($r->user()->isManager())return response()->json(['licensed'=>true,'status'=>'manager','activeInstallation'=>null]);
  $l=License::where('claimed_by',$r->user()->id)->first();
  return response()->json(['licensed'=>$l?->status==='active','status'=>$l?->status??'none','activeInstallation'=>$l?->installation]);
 }
 public function redeem(Request $r):JsonResponse {
  $data=$r->validate(['key'=>'required|string|max:90','installation'=>'required|string|max:128']);
  if(!preg_match('/^[a-f0-9-]{36}$/i',$data['installation']))return $this->fail('Invalid installation ID.',422);
  if(!preg_match('/^SBCC-(?:[A-F0-9]{8}-){5}[A-F0-9]{8}$/i',$data['key']))return $this->fail('Wrong license key. Please check and try again.',400);
  return DB::transaction(function()use($r,$data){
   $l=License::where('key_digest',hash('sha256',strtoupper(trim($data['key']))))->lockForUpdate()->first();
   if(!$l)return $this->fail('Wrong license key. Please check and try again.',400);
   if($l->status==='revoked')return $this->fail('This license has been revoked.',403);
   if($l->status!=='issued')return $this->fail('This license key has already been used.',409);
   if(strtolower($r->user()->email)!==$l->buyer_email)return $this->fail('Sign in with the email assigned to this license.',403);
   if(License::where('claimed_by',$r->user()->id)->exists())return $this->fail('This account already has a license.',409);
   $l->update(['status'=>'active','claimed_by'=>$r->user()->id,'installation'=>$data['installation'],'activated_at'=>now()]);
   $this->audit($r->user(),'license.redeem',['license_id'=>$l->id]);
   return response()->json(['redeemed'=>true]);
  },3);
 }
 public function activate(Request $r):JsonResponse {
  $data=$r->validate(['installation'=>'required|string|max:128']);
  if(!preg_match('/^[a-f0-9-]{36}$/i',$data['installation']))return $this->fail('Invalid installation ID.',422);
  return DB::transaction(function()use($r,$data){
   $l=License::where('claimed_by',$r->user()->id)->lockForUpdate()->first();
   if(!$l||$l->status!=='active')return $this->fail('No active purchased license.',403);
   if($l->installation && !hash_equals($l->installation,$data['installation']))return $this->fail('Release the previous installation or ask support for a reset.',409);
   $l->update(['installation'=>$data['installation'],'activated_at'=>now()]);
   $this->audit($r->user(),'license.activate',['license_id'=>$l->id]);return response()->json(['activated'=>true]);
  });
 }
 public function release(Request $r):JsonResponse {
  $data=$r->validate(['installation'=>'required|string|max:128']);
  return DB::transaction(function()use($r,$data){
   $l=License::where('claimed_by',$r->user()->id)->lockForUpdate()->first();
   if(!$l||$l->status!=='active'||!$l->installation||!hash_equals($l->installation,$data['installation']))return $this->fail('Only the active installation can be released.',409);
   $l->update(['installation'=>null]);$this->audit($r->user(),'license.release',['license_id'=>$l->id]);return response()->json(['released'=>true]);
  });
 }
 public function workspace(Request $r):JsonResponse {
  if($error=$this->licensed($r))return $error;
  $w=$this->workspaceFor($r->user());return response()->json(['revision'=>$w->revision,'data'=>$w->data]);
 }
 private function validateCollections(array $data):?string {
  foreach(self::COLLECTIONS as $table){
   if(!isset($data[$table])||!is_array($data[$table])||!array_is_list($data[$table])||count($data[$table])>400)return 'Invalid or oversized '.$table.' collection.';
   foreach($data[$table] as $row){if(!is_array($row)||!isset($row['id'])||!is_string($row['id'])||strlen($row['id'])>100)return 'Invalid row in '.$table.'.';}
  }
  if(strlen(json_encode($data))>180000)return 'Workspace exceeds temporary 180KB limit. Export data before continuing.';
  return null;
 }
 public function saveWorkspace(Request $r):JsonResponse {
  if($error=$this->licensed($r))return $error;
  $input=$r->validate(['revision'=>'required|integer|min:0','data'=>'required|array']);
  if($error=$this->validateCollections($input['data']))return $this->fail($error,422);
  $t0=hrtime(true);
  $this->workspaceFor($r->user());
  $marks=[];
  $response=DB::transaction(function()use($r,$input,$t0,&$marks){
   $row=DB::table('workspaces')->where('user_id',$r->user()->id)->lockForUpdate()->first();
   $marks['lock']=(hrtime(true)-$t0)/1e6;
   // Stale-tab writes fail rather than overwriting another tab (compare-and-swap on revision).
   if(!$row||(int)$row->revision!==(int)$input['revision'])return $this->fail('Another tab saved changes. Reload before editing again.',409,'WORKSPACE_CONFLICT');
   $old=json_decode((string)$row->data,true)?:[];
   // Server-side record rules (archive flags, categories, SKU uniqueness, history protection). Never frontend-only.
   $tr=hrtime(true);
   $violation=\App\Support\WorkspaceRules::validate($input['data'],$old);
   $marks['rules']=(hrtime(true)-$tr)/1e6;
   if($violation)return $this->fail($violation,422,'RECORD_RULE');
   $changed=DB::table('workspaces')->where('user_id',$r->user()->id)->where('revision',$input['revision'])
     ->update(['data'=>json_encode($input['data'],JSON_THROW_ON_ERROR),'revision'=>DB::raw('revision + 1'),'updated_at'=>now()]);
   if(!$changed)return $this->fail('Another tab saved changes. Reload before editing again.',409,'WORKSPACE_CONFLICT');
   return response()->json(['saved'=>true,'revision'=>$input['revision']+1]);
  });
  // Diagnostics only (durations in ms, no data): read via the browser's Network panel / Server-Timing.
  $marks['total']=(hrtime(true)-$t0)/1e6;
  return $response->header('Server-Timing',implode(', ',array_map(fn($k,$v)=>$k.';dur='.round($v,2),array_keys($marks),$marks)));
 }
 public function export(Request $r):JsonResponse {
  if($error=$this->licensed($r))return $error;
  $w=$this->workspaceFor($r->user());return response()->json(['format'=>'sbcc-local-export-v1','exportedAt'=>now()->toIso8601String(),'revision'=>$w->revision,'data'=>$w->data]);
 }
 private function manager(Request $r):?JsonResponse {return $r->user()->isManager()?null:$this->fail('Admin role required.',403);}
 public function issue(Request $r):JsonResponse {
  if($e=$this->manager($r))return $e;
  $data=$r->validate(['email'=>'required|email|max:254']);$email=strtolower(trim($data['email']));
  $key='SBCC-'.implode('-',str_split(strtoupper(bin2hex(random_bytes(24))),8));
  $l=License::create(['key_digest'=>hash('sha256',$key),'buyer_email'=>$email,'status'=>'issued']);
  $this->audit($r->user(),'license.issue',['license_id'=>$l->id,'buyer_email'=>$email]);
  return response()->json(['key'=>$key,'id'=>$l->id,'buyer_email'=>$email,'status'=>'issued'],201);
 }
 public function licenses(Request $r):JsonResponse {
  if($e=$this->manager($r))return $e;
  return response()->json(['items'=>License::query()->select('id','buyer_email','status','claimed_by','activated_at','created_at')->orderByDesc('id')->limit(100)->get()]);
 }
 public function licenseAction(Request $r):JsonResponse {
  if($e=$this->manager($r))return $e;
  $d=$r->validate(['id'=>'required|integer','action'=>'required|in:reset,revoke']);
  return DB::transaction(function()use($r,$d){
   $l=License::whereKey($d['id'])->lockForUpdate()->first();if(!$l)return $this->fail('License not found.',404);
   if($d['action']==='revoke')$l->update(['status'=>'revoked','installation'=>null]);
   else {if($l->status!=='active')return $this->fail('Only active licenses can be reset.',409);$l->update(['installation'=>null]);}
   $this->audit($r->user(),'license.'.$d['action'],['license_id'=>$l->id]);
   return response()->json(['ok'=>true]);
  });
 }
 public function localRole(Request $r):JsonResponse {return response()->json(['role'=>$r->user()->role,'canManageLicenses'=>$r->user()->isManager()]);}
 public function emptyImage(Request $r):JsonResponse {if($e=$this->licensed($r))return $e;return response()->json(['url'=>null]);}
 public function localProfile(Request $r):JsonResponse {
  if($e=$this->licensed($r))return $e;
  $profile=DB::table('sbcc_profiles')->where('user_id',$r->user()->id)->value('data');
  return response()->json(['profile'=>$profile?json_decode($profile,true):['displayName'=>'','businessName'=>'','businessType'=>'Handmade products','currency'=>'USD']]);
 }
 public function saveLocalProfile(Request $r):JsonResponse {
  if($e=$this->licensed($r))return $e;
  $data=$r->validate(['displayName'=>'nullable|string|max:80','businessName'=>'required|string|max:80','businessType'=>'required|string|max:200','currency'=>'required|string|size:3']);
  $data['displayName']=$data['displayName']??'';
  $existing=DB::table('sbcc_profiles')->where('user_id',$r->user()->id)->value('data');
  $oldCurrency=$existing?(json_decode($existing,true)['currency']??'USD'):'USD';
  if($data['currency']!==$oldCurrency)return $this->fail('Use currency conversion to change the workspace currency.',422);
  DB::table('sbcc_profiles')->updateOrInsert(['user_id'=>$r->user()->id],['data'=>json_encode($data),'updated_at'=>now()]);
  return response()->json(['profile'=>$data]);
 }
}
