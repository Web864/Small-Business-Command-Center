const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');

function client(handler){
  const calls=[];
  const exports={};
  const context={exports,URL,document:{cookie:''},window:{location:{origin:'http://127.0.0.1:5173',assign:p=>calls.push({redirect:p})}},fetch:async(url,options={})=>{
    calls.push({url,...options});
    const [status,data]=await handler(url,options);
    return {ok:status>=200&&status<300,status,json:async()=>data};
  }};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../src/local-laravel-client.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,context);
  return {...exports,calls};
}

test('session restoration distinguishes signed-out and server failure',async()=>{
  assert.equal(await client(()=>[401,{}]).auth.getUser(),null);
  await assert.rejects(client(()=>[500,{}]).auth.getUser(),/restore/);
  const c=client(()=>[200,{user:{id:7,email:'qa@example.invalid',name:'QA'}}]);
  assert.equal((await c.auth.getUser()).userId,'7');
  assert.equal(c.calls[0].credentials,'same-origin');
});

test('installation and license compatibility mapping',async()=>{
  const c=client(()=>[200,{status:'active',activeInstallation:'qa-device',licensed:true}]);
  const {data}=await c.api.get('/api/license?cc_installation=qa-device');
  assert.equal(data.licenseStatus,'active');
  assert.equal(data.deviceActive,true);
  assert.equal(c.calls[0].url,'/api/license');
  assert.equal(c.calls[0].headers['X-SBCC-Installation'],'qa-device');
});

test('concurrent mutations initialize CSRF once and send cookies',async()=>{
  const c=client(url=>[200,url==='/api/csrf'?{csrfToken:'synthetic-token'}:{}]);
  await Promise.all([c.api.post('/api/avatar',{}),c.api.delete('/api/cover')]);
  assert.equal(c.calls.filter(c=>c.url==='/api/csrf').length,1);
  for(const call of c.calls.filter(c=>c.method)){
    assert.equal(call.headers['X-CSRF-TOKEN'],'synthetic-token');
    assert.equal(call.credentials,'same-origin');
  }
});

test('workspace and conversion advance optimistic revision',async()=>{
  const c=client((url,options)=>[200,url==='/api/csrf'?{csrfToken:'synthetic-token'}:url==='/api/fx/convert'?{revision:5}:options.method==='GET'?{revision:3,data:{products:[]}}:{revision:4}]);
  await c.api.get('/api/workspace');
  await c.api.put('/api/workspace',{products:[]});
  assert.equal(JSON.parse(c.calls.at(-1).body).revision,3);
  await c.api.post('/api/fx/convert',{from:'USD',to:'EUR'});
  assert.equal(JSON.parse(c.calls.at(-1).body).revision,4);
  await c.api.put('/api/workspace',{products:[]});
  assert.equal(JSON.parse(c.calls.at(-1).body).revision,5);
});

test('CSRF expiration is surfaced and refreshed on next action',async()=>{
  let failed=false;
  const c=client(url=>url==='/api/csrf'?[200,{csrfToken:'synthetic-token'}]:!failed?(failed=true,[419,{message:'Expired'}]):[200,{}]);
  await assert.rejects(c.api.post('/api/logout'),e=>e.response.status===419);
  await c.api.post('/api/logout');
  assert.equal(c.calls.filter(c=>c.url==='/api/csrf').length,2);
});

test('hosted admin and license actions map to local endpoints',async()=>{
  const c=client(url=>[200,url==='/api/csrf'?{csrfToken:'synthetic-token'}:{key:'synthetic-key'}]);
  assert.equal((await c.api.post('/api/admin/licenses',{email:'qa@example.invalid'})).data.licenseKey,'synthetic-key');
  assert.equal(c.calls.at(-1).url,'/api/admin/issue');
  await c.api.post('/api/admin/licenses/12/reset',{});
  assert.equal(c.calls.at(-1).url,'/api/admin/license-action');
  assert.equal(JSON.parse(c.calls.at(-1).body).id,12);
  await c.api.post('/api/license/redeem',{licenseKey:'synthetic-key',deviceId:'qa-device'});
  assert.equal(JSON.parse(c.calls.at(-1).body).installation,'qa-device');
  await c.auth.signInWithRedirect();
  assert.equal(c.calls.at(-1).redirect,'/local-login');
});
