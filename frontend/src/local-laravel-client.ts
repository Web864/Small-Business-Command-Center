/** Local replacement for the hosted AppDeploy SDK. No hosted-AppDeploy SDK dependency. */
export type AuthUser = {userId:string; email:string; name:string};
type Response<T=any>={data:T};
let csrfToken:string|null=null;
let csrfPending:Promise<string>|null=null;
let revision=0;
function id() { const m=document.cookie.match(/(?:^|; )sbcc_installation=([^;]+)/);return m?decodeURIComponent(m[1]):''; }
async function csrf():Promise<string>{
  if(csrfToken)return csrfToken;
  if(!csrfPending)csrfPending=(async()=>{const response=await fetch('/api/csrf',{credentials:'same-origin',headers:{Accept:'application/json'}});if(!response.ok)throw new Error('Could not initialize local session.');const token=(await response.json()).csrfToken;if(typeof token!=='string'||!token)throw new Error('Invalid CSRF response.');csrfToken=token;return token;})().finally(()=>{csrfPending=null;});
  return csrfPending;
}
function installFromQuery(path:string){
  const url=new URL(path,window.location.origin);
  const deviceId=url.searchParams.get('cc_installation')||id();
  if(deviceId) document.cookie='sbcc_installation='+encodeURIComponent(deviceId)+'; Path=/; SameSite=Lax';
  url.searchParams.delete('cc_installation');
  return {path:url.pathname+url.search,deviceId};
}
async function request<T=any>(method:string,path:string,payload?:unknown):Promise<Response<T>>{
  const {path:clean,deviceId}=installFromQuery(path);
  let endpoint=clean;let body=payload;
  if(clean==='/api/license/redeem' && method==='POST'){const p=(payload||{}) as any;body={key:p.licenseKey,installation:p.deviceId};}
  if(clean==='/api/license/transfer' && method==='POST'){endpoint='/api/license/activate';body={installation:(payload as any)?.deviceId};}
  if(clean==='/api/license/release' && method==='POST')body={installation:(payload as any)?.deviceId};
  if(clean==='/api/license/activate' && method==='POST')body={installation:(payload as any)?.deviceId};
  if(clean==='/api/license/deactivate' && method==='POST'){endpoint='/api/license/release';body={installation:(payload as any)?.deviceId};}
  if(clean==='/api/admin/licenses' && method==='POST'){endpoint='/api/admin/issue';body=payload;}
  const actionMatch=clean.match(/^\/api\/admin\/licenses\/(\d+)\/(reset|revoke)$/);
  if(actionMatch && method==='POST'){endpoint='/api/admin/license-action';body={id:Number(actionMatch[1]),action:actionMatch[2]};}
  if(clean==='/api/workspace' && method==='PUT')body={revision,data:payload};
  if(clean==='/api/fx/convert' && method==='POST')body={...(payload as object),revision};
  const headers:Record<string,string>={'Accept':'application/json','X-SBCC-Installation':deviceId};
  if(method!=='GET'){headers['Content-Type']='application/json';headers['X-CSRF-TOKEN']=await csrf();}
  const startedAt=typeof performance!=='undefined'?performance.now():0;
  const response=await fetch(endpoint,{method,headers,credentials:'same-origin',body:method==='GET'?undefined:JSON.stringify(body??{})});
  try{ // Opt-in diagnostics (localStorage.sbcc_debug_timing='1'): records request time + the server's Server-Timing header. No payloads are logged.
    if(typeof localStorage!=='undefined'&&localStorage.getItem('sbcc_debug_timing')==='1'){
      const log=((globalThis as any).__sbccApiTimings ||= []) as unknown[];
      log.push({at:new Date().toISOString(),method,endpoint,status:response.status,headersMs:Math.round(performance.now()-startedAt),serverTiming:response.headers.get('Server-Timing')});
    }
  }catch{/* diagnostics must never affect requests */}
  const json=await response.json().catch(()=>({}));
  if(!response.ok){
    const message=json.error || json.message || ('Request failed with status code '+response.status);
    const error=Object.assign(new Error(message),{response:{status:response.status,data:json}});
    if(response.status===419)csrfToken=null;
    throw error;
  }
  if(clean==='/api/login'&&json.csrfToken)csrfToken=json.csrfToken;
  if(clean==='/api/fx/convert'&&typeof json.revision==='number')revision=json.revision;
  if(clean==='/api/license'){const d=json;const manager=d.status==='manager';return {data:{...d,ownerAccess:manager,commercialEnforcement:true,licenseStatus:manager?'active':d.status,licenseDeviceId:d.activeInstallation??null,activeDeviceId:d.activeInstallation??null,deviceActive:d.activeInstallation===deviceId,mode:'commercial',maxActiveDevices:1}} as Response<T>;}
  if(clean==='/api/license/my-role')return {data:json} as Response<T>;
  if(clean==='/api/workspace'){
    if(method==='GET'){revision=json.revision;return {data:{workspace:json.data,revision}} as Response<T>;}
    if(method==='PUT')revision=json.revision;
  }
  if(clean==='/api/admin/licenses'&&method==='GET')return {data:{items:(json.items||[]).map((l:any)=>({id:String(l.id),buyerEmail:l.buyer_email,status:l.status,claimedAt:l.activated_at||null})),hasMore:false}} as Response<T>;
  if(clean==='/api/admin/licenses'&&method==='POST')return {data:{licenseKey:json.key}} as Response<T>;
  return {data:json} as Response<T>;
}
export const api={
  get:<T=any>(path:string,_config?:unknown)=>request<T>('GET',path),
  post:<T=any>(path:string,body?:unknown,_config?:unknown)=>request<T>('POST',path,body),
  put:<T=any>(path:string,body?:unknown,_config?:unknown)=>request<T>('PUT',path,body),
  delete:<T=any>(path:string,_config?:unknown)=>request<T>('DELETE',path),
};
export const auth={
  async getUser():Promise<AuthUser|null>{const response=await fetch('/api/session',{credentials:'same-origin',headers:{Accept:'application/json'}});if(response.status===401)return null;if(!response.ok)throw new Error('Unable to restore local session.');const body=await response.json();csrfToken=null;revision=0;return {userId:String(body.user.id),email:body.user.email,name:body.user.name||body.user.email};},
  async signInWithRedirect(){window.location.assign('/login');},
  async signOut(){await request('POST','/api/logout');csrfToken=null;revision=0;},
};
