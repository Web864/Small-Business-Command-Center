import React, { useEffect, useMemo, useRef, useState } from 'react';
import { auth, api as platformApi } from '@appdeploy/client';
// AppDeploy's API is on a different origin from the hosted frontend.
// Browser cookies for the frontend host do not reach API requests.
// Pass the per-installation identifier explicitly through the SDK transport.
let activeInstallationId = '';
const withInstallation = (path:string):string => {
  if (!activeInstallationId) return path;
  return path + (path.includes('?') ? '&' : '?') + 'cc_installation=' + encodeURIComponent(activeInstallationId);
};
const api: typeof platformApi = {
  get: (path, config) => platformApi.get(withInstallation(path), config),
  post: (path, data) => platformApi.post(withInstallation(path), data),
  put: (path, data) => platformApi.put(withInstallation(path), data),
  delete: (path, config) => platformApi.delete(withInstallation(path), config),
};
import type { AuthUser } from '@appdeploy/client';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Users,
  Wallet,
  CalendarDays,
  Calculator,
  Plus,
  X,
  Menu,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ArrowLeft,
  Pencil,
  Trash2,
  UserCircle,
  LogOut,
  Sun,
  Moon,
  Palette,
  KeyRound,
  UserRound,
  Search,
  Camera,
  RotateCcw,
  NotebookPen,
  Eye,
  EyeOff,
  Printer,
  Download,
  FileText,
  Image as ImageIcon,
  ImagePlus,
  Bell,
  Clock3,
  Star,
} from 'lucide-react';
import { ChevronRight, ExternalLink } from 'lucide-react';

type Product = {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  min: number;
};
type OrderItem = { productId:string; name:string; sku:string; qty:number; unitPrice:number; unitCost:number };
type RefundEntry = { id: string; amount: number; date: string; method: string; reference: string; note: string };
type Order = {
  id: string;
  customer: string;
  productId: string;
  qty: number;
  items?: OrderItem[];
  paid: number;
  refunded?: number;
  refundHistory?: RefundEntry[];
  cancelledAt?: string;
  cancelReason?: string;
  total?: number;
  shipping?: number;
  tax?: number;
  discount?: number;
  discountPercent?: number;
  unitPrice?: number;
  status: string;
  date: string;
  scheduledDate?: string;
};
type Customer = { id: string; name: string; email: string; phone: string; company: string; address: string; city: string; country: string; notes: string };
type Note = { id: string; title: string; body: string; date: string; important?: boolean };
type Expense = { id: string; name: string; amount: number; date: string };
type Post = {
  id: string;
  platform: string;
  caption: string;
  date: string;
  status: string;
};
type Store = {
  products: Product[];
  orders: Order[];
  expenses: Expense[];
  posts: Post[];
  customers?: Customer[];
  notes?: Note[];
};
const seed: Store = {
  products: [
    {
      id: 'p1',
      name: 'Handmade Soy Candle',
      sku: 'CAN-01',
      price: 24,
      cost: 9,
      stock: 28,
      min: 8,
    },
    {
      id: 'p2',
      name: 'Linen Tote Bag',
      sku: 'BAG-02',
      price: 32,
      cost: 13,
      stock: 6,
      min: 10,
    },
    {
      id: 'p3',
      name: 'Personalized Notebook',
      sku: 'NOTE-03',
      price: 18,
      cost: 6,
      stock: 34,
      min: 12,
    },
  ],
  orders: [
    {
      id: 'ORD-1001',
      customer: 'Olivia Parker',
      productId: 'p1',
      qty: 2,
      paid: 48,
      status: 'Fulfilled',
      date: '2026-11-02',
    },
    {
      id: 'ORD-1002',
      customer: 'Amelia Brown',
      productId: 'p2',
      qty: 1,
      paid: 0,
      status: 'New',
      date: '2026-11-03',
    },
    {
      id: 'ORD-1003',
      customer: 'James Wilson',
      productId: 'p3',
      qty: 3,
      paid: 54,
      status: 'Processing',
      date: '2026-11-04',
    },
  ],
  expenses: [
    { id: 'e1', name: 'Packaging supplies', amount: 18, date: '2026-11-02' },
    { id: 'e2', name: 'Studio materials', amount: 25, date: '2026-11-03' },
  ],
  posts: [
    {
      id: 's1',
      platform: 'Instagram',
      caption: 'Behind the scenes: candle making',
      date: '2026-11-07',
      status: 'Planned',
    },
    {
      id: 's2',
      platform: 'Pinterest',
      caption: 'Gift ideas for small spaces',
      date: '2026-11-09',
      status: 'Draft',
    },
  ],
};
const nav = [
  ['Dashboard', LayoutDashboard],
  ['Orders', ShoppingBag],
  ['Products', Package],
  ['Customers', Users],
  ['Expenses', Wallet],
  ['Content Planner', CalendarDays],
  ['Pricing Lab', Calculator],
  ['Profile', UserCircle],
] as const;
const money = (v: number) =>
  `$${(Number.isFinite(v) ? v : 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const blank: Store = { products: [], orders: [], expenses: [], posts: [], customers: [], notes: [] };
const validDate=(v:unknown):boolean=>{
  if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;
  const d=new Date(v+'T00:00:00Z');
  return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v&&v>='1900-01-01'&&v<='2100-12-31';
};
const validMoney=(v:number)=>Number.isFinite(v)&&v>=0&&v<=1000000000&&Math.abs(v*100-Math.round(v*100))<0.001;
const validEmail=(v:string)=>!v.trim()||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const validPhone=(v:string)=>!v.trim()||(/^\+?[\d\s().-]+$/.test(v.trim())&&v.replace(/\D/g,'').length>=7&&v.replace(/\D/g,'').length<=15);
type FormFieldProps = {
  name: string;
  label: string;
  type?: string;
  options?: { value: string; label: string }[];
  form: Record<string, string>;
  change: (key: string, value: string) => void;
};
function Field({ name, label, type = 'text', options = [], form, change }: FormFieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      {options.length > 0 ? (
        <select value={form[name] || ''} onChange={e => change(name, e.target.value)}>
          <option value="">Choose...</option>
          {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      ) : (
        <input
          type={type}
          name={name}
          min={type==='number'?0:type==='date'?'1900-01-01':undefined}
          max={type==='number'?(name==='discount'?100:1000000000):type==='date'?'2100-12-31':undefined}
          step={type==='number'?(name==='stock'||name==='min'?'1':name==='discount'?'0.0001':'0.01'):undefined}
          maxLength={type==='text'?(name==='caption'?2000:name==='address'?250:120):type==='email'?254:undefined}
          value={form[name] || ''}
          onChange={e => change(name, e.target.value)}
          className={type === 'date' ? 'date-input-clickable' : undefined}
          onClick={type === 'date' ? (event) => {
            try {
              event.currentTarget.showPicker?.();
            } catch {
              // Some mobile browsers use their native date picker automatically.
            }
          } : undefined}
        />
      )}
    </label>
  );
}
const pageFromHash = () => {
  const page = decodeURIComponent(window.location.hash.slice(1));
  return nav.some(([name]) => name === page) ? page : 'Dashboard';
};

function App() {
  const [data, setData] = useState<Store>({ products: [], orders: [], expenses: [], posts: [] });
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({ displayName: '', businessName: '', businessType: 'Handmade products', currency: 'USD' });
  const [profileMessage, setProfileMessage] = useState('');
  const [pilotLicense, setPilotLicense] = useState<{
    mode:string;status:string;deviceActive:boolean;activeDeviceId:string|null;
    activatedAt:string|null;maxActiveDevices:number;commercialEnforcement:boolean;
    licenseStatus?:string;licenseDeviceId?:string|null;licensed?:boolean
  } | null>(null);
  const [pilotLicenseBusy, setPilotLicenseBusy] = useState(false);
  const [licenseGate, setLicenseGate] = useState(false);
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [licenseActionBusy, setLicenseActionBusy] = useState(false);
  const [licenseActionMessage, setLicenseActionMessage] = useState('');
  const [licenseActionError, setLicenseActionError] = useState(false);
  const [adminLicenseEmail, setAdminLicenseEmail] = useState('');
  const [adminLicenseKey, setAdminLicenseKey] = useState('');
  const [adminLicenses, setAdminLicenses] = useState<Array<{id:string;buyerEmail:string;status:string;claimedAt:string|null}>>([]);
  const [adminLicenseBusy, setAdminLicenseBusy] = useState(false);
  const [adminLicenseError, setAdminLicenseError] = useState('');
  const [adminLicenseMore, setAdminLicenseMore] = useState(false);
  const [verifiedRole, setVerifiedRole] = useState<'owner'|'admin'|'staff'|'customer'|'checking'>('checking');
  const [roleFeedback, setRoleFeedback] = useState('');
  const isLicenseAdmin = verifiedRole === 'owner' || verifiedRole === 'admin';
  const refreshVerifiedRole = async () => {
    setRoleFeedback('');
    try {
      const response = await api.get('/api/license/my-role');
      setVerifiedRole(response.data.role);
    } catch (err) {
      setVerifiedRole('customer');
      setRoleFeedback(err instanceof Error ? err.message : 'Unable to verify your account role.');
    }
  };
  useEffect(() => {
    if (!user) { setVerifiedRole('checking'); return; }
    void refreshVerifiedRole();
  }, [user?.userId]);
  const installationIdFor = (accountId:string) => {
    const key = 'command_pilot_installation_' + accountId;
    let value = localStorage.getItem(key);
    if (!value) { value = crypto.randomUUID(); localStorage.setItem(key,value); }
    activeInstallationId = value;
    return value;
  };
  const reloadWithLicense = async () => {
    setLicenseActionBusy(true);
    try {
      const status = (await api.get('/api/license')).data;
      setPilotLicense(status);
      const active = status.licenseStatus === 'active';
      const authorized = status.ownerAccess === true || (active && status.licenseDeviceId === installationIdFor(user!.userId));
      setLicenseGate(!authorized);
      if (authorized && user) {
        const [profileResult,workspaceResult] = await Promise.all([api.get('/api/me'),api.get('/api/workspace')]);
        setProfile(profileResult.data.profile);
        setData({...blank,...workspaceResult.data.workspace});
        setLoadError('');
      }
    } catch(err) { setLicenseActionMessage(err instanceof Error ? err.message : 'Could not check your license.'); }
    finally { setLicenseActionBusy(false); }
  };
  const commercialLicenseAction = async (action:'redeem'|'transfer'|'release') => {
    if (!user) return;
    setLicenseActionBusy(true);setLicenseActionMessage('');setLicenseActionError(false);
    try {
      const payload = action==='redeem' ? {licenseKey:licenseKeyInput.trim(),deviceId:installationIdFor(user.userId)} : {deviceId:installationIdFor(user.userId)};
      await api.post('/api/license/'+action,payload);
      if(action==='redeem')setLicenseKeyInput('');
      if(action==='release'){
        setLicenseActionMessage('Device released. You can activate the license on another browser.');
      } else {
        setLicenseActionMessage(action==='redeem'?'License activated.':'Installation activated.');
      }
      await reloadWithLicense();
    } catch(err) {
      const responseError = err as {response?:{status?:number;data?:{error?:string;message?:string}};message?:string};
      const status = responseError?.response?.status;
      const serverMessage = responseError?.response?.data?.error || responseError?.response?.data?.message || '';
      const raw = serverMessage || (err instanceof Error ? err.message : 'License action failed. Please try again.');
      const genericHttpError = /^request failed with status code \d+$/i.test(raw);
      const message = action==='redeem'
        ? status===400 || /wrong license key|enter a valid license key/i.test(raw)
          ? 'Wrong license key. Please check and try again.'
          : status===409
            ? (/already been used|already redeemed/i.test(serverMessage)
                ? 'This license key has already been used. Contact support.'
                : 'This license cannot be activated. It may have been used already. Contact support.')
            : status===403
              ? (serverMessage || 'This key is revoked or is assigned to a different account.')
              : (genericHttpError ? 'Unable to verify this license right now. Please try again.' : raw)
        : (genericHttpError ? 'Could not update this installation. Please try again.' : raw);
      setLicenseActionError(true);
      setLicenseActionMessage(message);
    }
    finally {setLicenseActionBusy(false);}
  };
  const loadAdminLicenses = async () => {
    if (!isLicenseAdmin) return;
    setAdminLicenseBusy(true);setAdminLicenseError('');
    try {
      const response = await api.get('/api/admin/licenses');
      setAdminLicenses(response.data.items||[]);
      setAdminLicenseMore(Boolean(response.data.hasMore));
    } catch(err) {setAdminLicenseError(err instanceof Error ? err.message : 'Could not load licenses.');}
    finally {setAdminLicenseBusy(false);}
  };
  const issueAdminLicense = async () => {
    setAdminLicenseBusy(true);setAdminLicenseError('');setAdminLicenseKey('');
    try {
      const result = await api.post('/api/admin/licenses',{email:adminLicenseEmail.trim().toLowerCase()});
      setAdminLicenseKey(result.data.licenseKey);
      setAdminLicenseEmail('');
      const response = await api.get('/api/admin/licenses');
      setAdminLicenses(response.data.items||[]);
      setAdminLicenseMore(Boolean(response.data.hasMore));
    } catch(err) {setAdminLicenseError(err instanceof Error ? err.message : 'Could not issue license.');}
    finally {setAdminLicenseBusy(false);}
  };
  const manageAdminLicense = async (licenseId:string,action:'revoke'|'reset') => {
    if (!window.confirm(action==='revoke'?'Revoke this license? The buyer will lose access.':'Reset active installation for this buyer?')) return;
    setAdminLicenseBusy(true);setAdminLicenseError('');
    try {
      await api.post('/api/admin/licenses/'+licenseId+'/'+action,{});
      const response=await api.get('/api/admin/licenses');
      setAdminLicenses(response.data.items||[]);
      setAdminLicenseMore(Boolean(response.data.hasMore));
    } catch(err) {setAdminLicenseError(err instanceof Error ? err.message : 'Could not update license.');}
    finally {setAdminLicenseBusy(false);}
  };
  const [pilotLicenseMessage, setPilotLicenseMessage] = useState('');
  const ownPilotDeviceId = () => {
    if (!user) throw new Error('Please sign in.');
    const key = 'command_pilot_installation_' + user.userId;
    let value = localStorage.getItem(key);
    if (!value) {
      value = crypto.randomUUID();
      localStorage.setItem(key, value);
    }
    return value;
  };
  const refreshPilotLicense = async () => {
    const response = await api.get('/api/license');
    setPilotLicense(response.data);
  };
  const updatePilotLicense = async (action:'activate'|'deactivate') => {
    setPilotLicenseBusy(true);
    setPilotLicenseMessage('');
    try {
      const deviceId = ownPilotDeviceId();
      await api.post('/api/license/'+action, { deviceId });
      await refreshPilotLicense();
      setPilotLicenseMessage(action === 'activate' ? 'This browser is registered for the pilot.' : 'This browser has been deactivated.');
    } catch (err) {
      setPilotLicenseMessage(err instanceof Error ? err.message : 'Unable to update pilot activation.');
      await refreshPilotLicense().catch(()=>{});
    } finally { setPilotLicenseBusy(false); }
  };
  useEffect(() => {
    if (!user) { setPilotLicense(null); return; }
    void refreshPilotLicense().catch(() => setPilotLicenseMessage('License status is temporarily unavailable.'));
  }, [user]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [productImages, setProductImages] = useState<Record<string,string|null>>({});
  const [productPhotoDraft, setProductPhotoDraft] = useState<string|null>(null);
  const [productPhotoRemove, setProductPhotoRemove] = useState(false);
  const [productPhotoBusy, setProductPhotoBusy] = useState(false);
  const [logoPreviewOpen, setLogoPreviewOpen] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [productQuery, setProductQuery] = useState('');
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  useEffect(()=>{
    if (!user || !data.products.length) {setProductImages({});return;}    let active=true;
    const products=data.products;
    Promise.all(products.map(async p=>{
      try {        const result=await api.get('/api/product-image/'+encodeURIComponent(p.id));
        return [p.id,result.data.url||null] as const;
      } catch {return [p.id,null] as const;}
    })).then(results=>{
      if(active)setProductImages(Object.fromEntries(results));
    });
    return ()=>{active=false;};
  },[user,data.products]);
  const [draftItems,setDraftItems]=useState<OrderItem[]>([]);
  const pickerRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const close=(event:PointerEvent)=>{
      if(pickerRef.current && !pickerRef.current.contains(event.target as Node))setProductSearchOpen(false);
    };
    document.addEventListener('pointerdown',close);
    return ()=>document.removeEventListener('pointerdown',close);
  },[]);
  const [ordersQuery, setOrdersQuery] = useState('');
  const [hiddenMetrics, setHiddenMetrics] = useState<Record<string,boolean>>({});
  const [invoiceOrder,setInvoiceOrder]=useState<Order|null>(null);  const [invoiceDownloading,setInvoiceDownloading]=useState(false);
  const toggleMetric = (title:string) => setHiddenMetrics(state=>({...state,[title]:state[title]===false}));
  const currencyCode = ['USD','GBP','EUR','PKR','CAD','AUD'].includes(profile.currency) ? profile.currency : 'USD';
  const money = (amount: number) => new Intl.NumberFormat('en-US', {
    style: 'currency', currency: currencyCode, minimumFractionDigits: 2, maximumFractionDigits: 2
  }).format(Number.isFinite(amount) ? amount : 0);
  const avatarImage = (size: 'small' | 'large') => avatarUrl
    ? <img className={'avatar-photo ' + size} src={avatarUrl} alt="My profile photo"
        onError={() => setAvatarUrl(null)} />
    : size === 'large' ? <UserRound size={43}/> :      (profile.displayName || user?.name || user?.email || 'SB').slice(0,2).toUpperCase();
  const compressImage = async (file: File, kind: 'avatar' | 'cover') => {
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Choose a JPG, PNG or WebP image.');
    if (file.size > 8 * 1024 * 1024) throw new Error('Maximum file size is 8 MB.');
    const url = URL.createObjectURL(file);
    try {      const img = await new Promise<HTMLImageElement>((resolve,reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error('Could not read this image.'));
        element.src = url;
      });
      const maxWidth = kind === 'avatar' ? 400 : 1360;
      const maxHeight = kind === 'avatar' ? 400 : 440;
      const scale = Math.min(1, maxWidth/img.naturalWidth, maxHeight/img.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.naturalWidth*scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight*scale));
      const ctx = canvas.getContext('2d');      if (!ctx) throw new Error('Image editing not supported.');      ctx.drawImage(img,0,0,canvas.width,canvas.height);
      const encoded = canvas.toDataURL('image/jpeg',0.7).split(',')[1];
      if (encoded.length > (kind === 'avatar' ? 600000 : 1000000)) throw new Error('Please choose a smaller image.');
      return encoded;
    } finally { URL.revokeObjectURL(url); }
  };
  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setAvatarBusy(true);
    setProfileMessage('Uploading your photo…');
    try {
      const imageData = await compressImage(file,'avatar');
      const response = await api.post('/api/avatar',{imageData,contentType:'image/jpeg'});
      if (!response.data.url) throw new Error('Photo not returned by server.');
      setAvatarUrl(response.data.url);
      setProfileMessage('Photo successfully saved.');
    } catch(err) { setProfileMessage(err instanceof Error ? err.message : 'Photo upload failed.'); }
    finally { setAvatarBusy(false); }
  };
  const removeAvatar = async () => {
    setAvatarBusy(true);
    try { await api.delete('/api/avatar'); setAvatarUrl(null); setProfileMessage('Profile photo removed.'); }
    catch(err) { setProfileMessage(err instanceof Error ? err.message : 'Could not remove photo.'); }
    finally { setAvatarBusy(false); }
  };
  const uploadCover = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setCoverBusy(true);
    setProfileMessage('Uploading your cover…');
    try {
      const imageData = await compressImage(file,'cover');
      const response = await api.post('/api/cover',{imageData,contentType:'image/jpeg'});
      if (!response.data.url) throw new Error('Cover not returned by server.');
      setCoverUrl(response.data.url);
      setProfileMessage('Cover successfully saved.');
    } catch(err) { setProfileMessage(err instanceof Error ? err.message : 'Cover upload failed.'); }
    finally { setCoverBusy(false); }
  };
  const uploadLogo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file=event.target.files?.[0];
    event.target.value='';
    if(!file)return;
    setLogoBusy(true);
    try {
      const imageData=await compressImage(file,'avatar');
      const response=await api.post('/api/logo',{imageData,contentType:'image/jpeg'});
      if(!response.data.url)throw new Error('Could not save logo.');
      setLogoUrl(response.data.url);
    } catch(err) { window.alert(err instanceof Error?err.message:'Logo upload failed.'); }
    finally {setLogoBusy(false);}
  };
  const prepareProductPhoto=async (event:React.ChangeEvent<HTMLInputElement>)=>{
    const file=event.target.files?.[0];
    event.target.value='';
    if(!file)return;
    setProductPhotoBusy(true);
    setError('');
    try {
      const imageData=await compressImage(file,'avatar');
      setProductPhotoDraft('data:image/jpeg;base64,'+imageData);
      setProductPhotoRemove(false);
    } catch(err) {
      setError(err instanceof Error?err.message:'Could not read image.');
    } finally {setProductPhotoBusy(false);}
  };
  const removeCover = async () => {
    setCoverBusy(true);
    try { await api.delete('/api/cover'); setCoverUrl(null); setProfileMessage('Cover removed.'); }
    catch(err) { setProfileMessage(err instanceof Error ? err.message : 'Could not remove cover.'); }
    finally { setCoverBusy(false); }
  };
  useEffect(() => {
    let active = true;
    const restore = async () => {
      try {
        const account = await auth.getUser();
        if (!active) return;
        if (account) {
          const deviceId=installationIdFor(account.userId);
          const licenseResponse=await api.get('/api/license');
          if (!active) return;
          setPilotLicense(licenseResponse.data);
          const licenseBlocked=licenseResponse.data.ownerAccess !== true &&
            (licenseResponse.data.licenseStatus!=='active' || licenseResponse.data.licenseDeviceId!==deviceId);
          setLicenseGate(Boolean(licenseBlocked));
          if (!licenseBlocked) {
            const [profileResult, workspaceResult, avatarResult, coverResult, logoResult] = await Promise.all([
              api.get('/api/me'), api.get('/api/workspace'),
              api.get('/api/avatar').catch(() => ({data:{url:null}})),
              api.get('/api/cover').catch(() => ({data:{url:null}})),
              api.get('/api/logo').catch(() => ({data:{url:null}}))
            ]);
            if (!active) return;
            setProfile(profileResult.data.profile);
            setData({ ...blank, ...workspaceResult.data.workspace, customers: workspaceResult.data.workspace.customers || [], notes: workspaceResult.data.workspace.notes || [] });
            setAvatarUrl(avatarResult.data.url || null);
            setCoverUrl(coverResult.data.url || null);
            setLogoUrl(logoResult.data.url || null);
          }
        }
        setUser(account);
      } catch (err) {
        if (active) {
          const failure = err as {response?:{status?:number;data?:{error?:string}};message?:string};
          if (failure?.response?.status === 403) {
            // A license restriction should lead back to activation/recovery,
            // never strand the customer on an opaque workspace error screen.
            setLicenseGate(true);
            setLoadError('');
            try { setUser(await auth.getUser()); } catch { /* Sign-in screen can recover. */ }
          } else {
            setLoadError(failure?.response?.data?.error || (err instanceof Error ? err.message : 'Failed to restore your account.'));
          }
        }
      } finally { if (active) setAuthReady(true); }
    };
    void restore();
    return () => { active = false; };
  }, []);
  const [page, setPage] = useState(pageFromHash);
  const [inAppNavigation, setInAppNavigation] = useState(false);
  useEffect(() => {
    const onHashChange = () => setPage(pageFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  const [modal, setModal] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [orderTab, setOrderTab] = useState<'All' | 'Processing' | 'Completed' | 'Cancelled'>('All');
  const [actionError, setActionError] = useState('');
  const [orderAction, setOrderAction] = useState<{ kind: 'complete' | 'delete' | 'cancel' | 'refund'; orderId: string } | null>(null);  const [additionalPayment, setAdditionalPayment] = useState('0');
  const [acknowledgePending, setAcknowledgePending] = useState(false);
  const [refundAmount, setRefundAmount] = useState('0');
  const [refundMethod, setRefundMethod] = useState('Original payment method');
  const [refundReference, setRefundReference] = useState('');
  const [refundNote, setRefundNote] = useState('');
  const [refundDate, setRefundDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [mobile, setMobile] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'warm'>(() => {
    try {
      const saved = localStorage.getItem('command_center_theme');
      return saved === 'dark' || saved === 'warm' ? saved : 'light';
    } catch { return 'light'; }
  });
  const [headerMenu, setHeaderMenu] = useState<'theme' | 'account' | 'notifications' | null>(null);
  const [globalQuery,setGlobalQuery]=useState('');
  const [globalSearchOpen,setGlobalSearchOpen]=useState(false);
  const [catalogQuery,setCatalogQuery]=useState('');
  const globalSearchRef=useRef<HTMLDivElement>(null);
  const [passwordHelp, setPasswordHelp] = useState(false);
  const [currencyModal, setCurrencyModal] = useState(false);
  const [currencyTarget, setCurrencyTarget] = useState('USD');
  const [fxQuote, setFxQuote] = useState<{from:string;to:string;rate:number;date:string;source:string}|null>(null);
  const [currencyBusy, setCurrencyBusy] = useState(false);
  const [currencyError, setCurrencyError] = useState('');
  const [lastConversion, setLastConversion] = useState('');
  const headerMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    try { localStorage.setItem('command_center_theme', theme); } catch {}
  }, [theme]);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(event.target as Node)) setHeaderMenu(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setHeaderMenu(null); setGlobalSearchOpen(false); setPasswordHelp(false); setLogoPreviewOpen(false); }
    };
    const closeSearch = (event:PointerEvent) => {
      if(globalSearchRef.current && !globalSearchRef.current.contains(event.target as Node))setGlobalSearchOpen(false);
    };
    document.addEventListener('pointerdown', closeSearch);
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('pointerdown', closeSearch); document.removeEventListener('keydown', escape); };
  }, []);
  const toggleSidebar = () => {
    if (window.matchMedia('(max-width: 900px)').matches) {
      setMobile(open => !open);
    } else {
      setSidebarCollapsed(collapsed => !collapsed);
    }
  };
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [fee, setFee] = useState(6.5);
  const [fixed, setFixed] = useState(0.3);
  const [desired, setDesired] = useState(10);
  const [pack, setPack] = useState(2);
  const [ship, setShip] = useState(3);
  const [calcId, setCalcId] = useState('p1');
  const save = async (next: Store) => {
    if (!user) throw new Error('Please sign in.');
    setSaving(true);
    try {
      await api.put('/api/workspace', next);
      setData(next);
    } finally { setSaving(false); }
  };

  const downloadInvoice = async (selectedOrder?: Order) => {
    const order = selectedOrder || invoiceOrder;
    if (!order || invoiceDownloading) return;
    setInvoiceDownloading(true);
    try {
      const { jsPDF } = await import('jspdf');      const pdf = new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
      const items = orderItems(order);
      const customer = (data.customers || []).find(c=>c.name.toLowerCase()===order.customer.toLowerCase());
      const navy: [number,number,number] = [17,47,99];
      const dark: [number,number,number] = [28,36,50];
      const muted: [number,number,number] = [90,102,117];
      const moneyText=(n:number)=>currencyCode+' '+Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
      const ink=(c:[number,number,number])=>pdf.setTextColor(...c);
      const fill=(c:[number,number,number])=>pdf.setFillColor(...c);
      const wave=(top:boolean)=>{
        const pts: Array<[number,number]> = top
          ? [[0,0],[210,0],[210,14],[170,17],[130,16],[92,12],[59,10],[32,12],[0,35]]          : [[0,276],[29,273],[61,278],[95,286],[129,292],[162,289],[189,281],[210,270],[210,297],[0,297]];
        fill(navy);
        const segments=pts.slice(1).map((p,i)=>[p[0]-pts[i][0],p[1]-pts[i][1]]);
        pdf.lines(segments,pts[0][0],pts[0][1],[1,1],'F',true);
      };
      let page=0;
      const pageSetup=(first:boolean)=>{
        if(page>0)pdf.addPage();
        page++;
        wave(true);
        wave(false);        if(!first){
          pdf.setFont('helvetica','bold');pdf.setFontSize(9);ink(navy);
          pdf.text('INVOICE · '+order.id,15,53);
          pdf.setFont('helvetica','normal');pdf.text('Continued — page '+page,195,53,{align:'right'});
        }
      };
      pageSetup(true);
      pdf.setFont('times','normal');pdf.setFontSize(22);ink(dark);pdf.text('INVOICE',17,58);
      pdf.setFont('helvetica','normal');pdf.setFontSize(8.5);ink(muted);
      pdf.text('Invoice Number: '+order.id,17,65);
      pdf.text('Date: '+order.date,17,70);
      const businessName=profile.businessName||'My Business';
      pdf.setFont('helvetica','bold');pdf.setFontSize(14);ink(dark);
      pdf.text(pdf.splitTextToSize(businessName,76).slice(0,3),192,53,{align:'right'});
      if(logoUrl?.startsWith('data:image/')){
        try {pdf.addImage(logoUrl,'JPEG',173,57,19,19,undefined,'FAST');}
        catch{ /* Continue when logo cannot be embedded. */ }
      } else {
        fill([247,191,53]);pdf.rect(178,62,12,13,'F');
      }
      const subsection=(label:string,x:number,y:number)=>{
        pdf.setFont('helvetica','bold');pdf.setFontSize(9);ink(dark);pdf.text(label,x,y);
      };
      subsection('BILL TO:',17,94);
      subsection('PAYMENT INFORMATION:',112,94);
      pdf.setFont('helvetica','bold');pdf.setFontSize(9);ink(dark);
      pdf.text(pdf.splitTextToSize(order.customer,87).slice(0,2),17,101);
      pdf.setFont('helvetica','normal');pdf.setFontSize(8);ink(muted);
      let contactY=110;
      if(customer){
        [customer.company,customer.address,[customer.city,customer.country].filter(Boolean).join(', '),customer.email,customer.phone]
          .filter(Boolean).slice(0,5).forEach(s=>{
            pdf.text(pdf.splitTextToSize(s,84).slice(0,1),17,contactY);            contactY+=4.7;
          });
      }
      pdf.setFont('helvetica','normal');pdf.setFontSize(8);ink(dark);
      ['Order: '+order.id,'Status: '+order.status,'Currency: '+currencyCode,'Received: '+moneyText(order.paid)]
        .forEach((v,i)=>pdf.text(v,112,101+i*6));
      const tableHead=(y:number)=>{
        fill(navy);pdf.rect(15,y,180,11,'F');
        pdf.setFont('helvetica','bold');pdf.setFontSize(8);ink([255,255,255]);
        pdf.text('ITEM',20,y+7);
        pdf.text('DESCRIPTION',44,y+7);
        pdf.text('RATE',155,y+7,{align:'right'});
        pdf.text('AMOUNT',190,y+7,{align:'right'});
      };
      let y=137;
      tableHead(y);y+=12;
      items.forEach((item,index)=>{
        const description=pdf.splitTextToSize(item.name||'Product',88).slice(0,3);
        const h=Math.max(12,description.length*4.5+5);
        if(y+h>237){pageSetup(false);y=64;tableHead(y);y+=12;}
        pdf.setFont('helvetica','normal');pdf.setFontSize(8);ink(dark);
        pdf.text(String(index+1)+'.',21,y+5);
        pdf.text(description,44,y+5);
        pdf.setFontSize(7);ink(muted);
        pdf.text('Qty '+item.qty+(item.sku?' · '+item.sku:''),44,y+5+description.length*4.3);
        pdf.setFontSize(8);ink(dark);
        pdf.text(moneyText(item.unitPrice),155,y+5,{align:'right'});
        pdf.text(moneyText(item.unitPrice*item.qty),190,y+5,{align:'right'});
        pdf.setDrawColor(226,230,235);pdf.line(15,y+h,195,y+h);
        y+=h;
      });
      if(y>217){pageSetup(false);y=64;}
      const totalsX=123,totalsRight=191;
      let totalsY=y+8;
      fill([255,255,255]);pdf.setDrawColor(157,168,180);
      pdf.rect(totalsX,totalsY,72,29,'S');
      const summary:[string,number][]=[
        ['Sub Total',items.reduce((sum,l)=>sum+l.qty*l.unitPrice,0)],
        ['Discount',-(order.discount||0)],
        ['Shipping',order.shipping||0],
        ['Sales Tax',order.tax||0]
      ];
      summary.forEach(([label,value],i)=>{
        pdf.setFont('helvetica','normal');pdf.setFontSize(7.5);ink(muted);
        pdf.text(label,totalsX+4,totalsY+6+i*6.2);
        ink(dark);pdf.text(moneyText(value),totalsRight,totalsY+6+i*6.2,{align:'right'});
      });
      totalsY+=34;
      fill(navy);pdf.rect(totalsX,totalsY,72,12,'F');
      pdf.setFont('helvetica','bold');pdf.setFontSize(10);ink([255,255,255]);
      pdf.text('TOTAL:',totalsX+4,totalsY+8);
      pdf.text(moneyText(orderTotal(order)),totalsRight,totalsY+8,{align:'right'});
      pdf.setFont('helvetica','normal');pdf.setFontSize(8);ink(dark);
      pdf.text('Received: '+moneyText(order.paid),totalsX,totalsY+19);
      pdf.text('Balance Due: '+moneyText(Math.max(0,orderTotal(order)-order.paid)),totalsX,totalsY+25);
      subsection('TERM AND CONDITIONS:',17,Math.min(259,totalsY+7));
      pdf.setFont('helvetica','normal');pdf.setFontSize(7.7);ink(muted);
      pdf.text(pdf.splitTextToSize('Thank you for your business. Remaining payments are due under the agreed terms.',95).slice(0,2),17,Math.min(264,totalsY+13));
      pdf.save('Invoice-'+order.id.replace(/[^A-Za-z0-9_-]/g,'')+'.pdf');
    } catch(err) {
      window.alert('PDF download failed: '+(err instanceof Error?err.message:'Please try Print instead.'));
    } finally {
      setInvoiceDownloading(false);
    }
  };
  const previewCurrency = async(to: string) => {
    setCurrencyTarget(to);
    setCurrencyError('');
    setFxQuote(null);
    if (to === profile.currency) return;
    try {
      const response = await api.get('/api/fx/' + encodeURIComponent(to));
      const quote = response.data;
      if (!Number.isFinite(quote.rate) || quote.rate <= 0) throw new Error('Could not verify the exchange rate.');
      setFxQuote(quote);
    } catch(err) {
      setCurrencyError(err instanceof Error ? err.message : 'Could not fetch exchange rate.');
    }
  };
  const applyCurrencyConversion = async() => {
    if (!fxQuote || currencyBusy) return;
    setCurrencyBusy(true);
    setCurrencyError('');
    try {
      const response = await api.post('/api/fx/convert', {
        from: profile.currency, to: fxQuote.to, expectedRate: fxQuote.rate
      });
      const result = response.data;
      setProfile(result.profile);
      setData(result.workspace);
      setPack(v => Math.round(v * result.rate * 100) / 100);
      setShip(v => Math.round(v * result.rate * 100) / 100);
      setFixed(v => Math.round(v * result.rate * 100) / 100);
      setDesired(v => Math.round(v * result.rate * 100) / 100);
      setLastConversion('Last conversion: 1 ' + result.from + ' = ' + Number(result.rate).toFixed(6) + ' ' + result.to + ' (' + result.date + ')');
      setCurrencyModal(false);
      setFxQuote(null);
    } catch(err) {
      setCurrencyError(err instanceof Error ? err.message : 'Currency conversion failed. No change was made locally.');
    } finally {
      setCurrencyBusy(false);
    }
  };
  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!profile.businessName.trim()){setProfileMessage('Business name is required.');return;}
    if(profile.businessName.trim().length>80||profile.displayName.trim().length>80){setProfileMessage('Names must be 80 characters or fewer.');return;}
    setProfileMessage('Saving profile…');
    try {
      const result = await api.put('/api/profile', profile);
      setProfile(result.data.profile);
      setProfileMessage('Profile saved.');
    } catch (err) {
      setProfileMessage(err instanceof Error ? err.message : 'Could not save profile.');
    }
  };  const product = (id: string) => data.products.find(p => p.id === id);
  const orderItems = (o:Order):OrderItem[] => o.items?.length ? o.items : [{
    productId:o.productId,name:product(o.productId)?.name||'Product',sku:product(o.productId)?.sku||'',
    qty:o.qty,unitPrice:o.unitPrice??product(o.productId)?.price??0,unitCost:product(o.productId)?.cost??0
  }];
  const orderTotal = (o: Order) => o.total ?? (
    orderItems(o).reduce((sum,line)=>sum+line.unitPrice*line.qty,0)+(o.shipping||0)+(o.tax||0)-(o.discount||0)
  );
  const refundedAmount = (o: Order) => Math.round((o.refunded ?? (o.refundHistory || []).reduce((s,r) => s+r.amount,0))*100)/100;
  const refundDue = (o: Order) => o.status === 'Cancelled' ? Math.max(0,Math.round((o.paid-refundedAmount(o))*100)/100) : 0;
  const refundStatus = (o: Order) => o.status !== 'Cancelled'
    ? (o.paid >= orderTotal(o)-0.001 ? 'Paid' : o.paid > 0 ? 'Partially paid' : 'Unpaid')
    : o.paid <= 0 ? 'No refund required' : refundDue(o) <= 0.001 ? 'Fully refunded'
    : refundedAmount(o)>0 ? 'Partially refunded' : 'Refund pending';
  const activeOrders = data.orders.filter(o => o.status !== 'Cancelled');
  const sales = activeOrders.reduce((s,o) => s + orderTotal(o), 0);
  const grossReceived = data.orders.reduce((s,o) => s+o.paid,0);
  const refundsIssued = data.orders.reduce((s,o) => s+refundedAmount(o),0);
  const received = Math.round((grossReceived-refundsIssued)*100)/100;
  const refundPending = data.orders.reduce((s,o) => s+refundDue(o),0);
  const activeReceived = activeOrders.reduce((s,o) => s+o.paid,0);
  const expenses = data.expenses.reduce((s,e) => s+e.amount,0);
  const cogs = activeOrders.reduce((s,o) => s+orderItems(o).reduce((sum,line)=>sum+line.unitCost*line.qty,0),0);
  const profit = activeReceived-cogs-expenses;
  const outstanding = activeOrders.reduce((s,o) => s+Math.max(0,orderTotal(o)-o.paid),0);
  const sold = (id: string) =>
    data.orders.filter(o=>o.status!=='Cancelled')
      .reduce((sum,o)=>sum+orderItems(o).filter(line=>line.productId===id).reduce((qty,line)=>qty+line.qty,0),0);
  const available = (p: Product) => p.stock - sold(p.id);
  const customers = useMemo(() => {
    const map=new Map<string, Customer>();
    for(const c of data.customers || []) map.set(c.name.trim().toLowerCase(),c);
    for(const o of data.orders) {
      const key=o.customer.trim().toLowerCase();      if(key && !map.has(key))map.set(key,{id:'auto-'+key,name:o.customer,email:'',phone:'',company:'',address:'',city:'',country:'',notes:''});
    }
    return Array.from(map.values()).map(c=>({
      ...c,
      orders:data.orders.filter(o=>o.customer.toLowerCase()===c.name.toLowerCase()).length,
      spent:data.orders.filter(o=>o.customer.toLowerCase()===c.name.toLowerCase()).reduce((sum,o)=>sum+o.paid-refundedAmount(o),0)
    })).sort((a,b)=>a.name.localeCompare(b.name));
  },[data]);
  const open = (kind: string) => {
    setEditingId(null);
    setModal(kind);
    setForm({});
    setProductQuery('');
    setProductSearchOpen(false);
    setDraftItems([]);
    setProductPhotoDraft(null);
    setProductPhotoRemove(false);
    setError('');
  };
  const editCustomer = (c: Customer) => {
    setModal('Customer');
    setEditingId(c.id.startsWith('auto-') ? null : c.id);
    setForm({name:c.name,email:c.email,phone:c.phone,company:c.company,address:c.address,city:c.city,country:c.country,notes:c.notes});
    setError('');
  };
  const editNote = (note: Note) => {
    setEditingId(note.id);
    setModal('Note');
    setForm({title:note.title,body:note.body,date:note.date,important:note.important?'true':'false'});
    setError('');
  };
  const editProduct = (p: Product) => {
    setEditingId(p.id);
    setModal('Product');
    setProductPhotoDraft(null);
    setProductPhotoRemove(false);
    setError('');
    setForm({
      name: p.name, sku: p.sku, price: String(p.price),
      cost: String(p.cost), stock: String(p.stock), min: String(p.min)
    });
  };
  const editOrder = (o:Order) => {
    const items=orderItems(o);
    const base=items.reduce((sum,line)=>sum+line.qty*line.unitPrice,0);
    const percentage=o.discountPercent??(base>0?(o.discount||0)/base*100:0);
    setEditingId(o.id);setModal('Order');setProductQuery('');setProductSearchOpen(false);
    setDraftItems(items.map(line=>({...line})));setError('');
    setForm({      customer:o.customer,productId:o.productId,qty:String(o.qty),paid:String(o.paid),
      shipping:String(o.shipping||0),tax:String(o.tax||0),
      discount:String(Number(percentage.toFixed(4))),
      status:o.status==='Fulfilled'?'Completed':o.status,
      scheduledDate:o.scheduledDate||''
    });
  };
  const addDraftProduct = (p:Product) => {
    setDraftItems(lines=>{
      const found=lines.find(line=>line.productId===p.id);
      if(found)return lines.map(line=>line.productId===p.id?{...line,qty:line.qty+1}:line);
      return [...lines,{productId:p.id,name:p.name,sku:p.sku,qty:1,unitPrice:p.price,unitCost:p.cost}];
    });    setProductQuery('');
    setProductSearchOpen(false);
  };
  const openOrderAction = (kind: 'complete' | 'delete' | 'cancel' | 'refund', o: Order) => {
    if (saving) return;
    setActionError('');
    setAdditionalPayment('0');
    setAcknowledgePending(false);
    setRefundAmount('0');
    setRefundMethod('Original payment method');
    setRefundReference('');    setRefundNote('');
    setRefundDate(new Date().toISOString().slice(0,10));
    setOrderAction({kind,orderId:o.id});
  };
  const selectedActionOrder = orderAction
    ? data.orders.find(order => order.id === orderAction.orderId)
    : undefined;
  const actionOrderTotal = selectedActionOrder ? Math.round(orderTotal(selectedActionOrder) * 100) / 100 : 0;
  const recordedPaid = selectedActionOrder ? Math.round(selectedActionOrder.paid * 100) / 100 : 0;
  const alreadyRefunded = selectedActionOrder ? refundedAmount(selectedActionOrder) : 0;
  const refundable = Math.max(0, Math.round((recordedPaid-alreadyRefunded)*100)/100);
  const refundNow = refundAmount.trim() === '' ? NaN : Number(refundAmount);
  const validRefund = Number.isFinite(refundNow) && refundNow >= 0 &&
    Number.isInteger(Math.round(refundNow*100)) && Math.abs(Math.round(refundNow*100)-refundNow*100)<0.001 &&
    Math.round(refundNow*100)<=Math.round(refundable*100);
  const paymentToAdd = additionalPayment.trim() === '' ? NaN : Number(additionalPayment);
  const validAdditionalPayment = validMoney(paymentToAdd) &&
    Math.round(paymentToAdd * 100) <= Math.round((actionOrderTotal - recordedPaid) * 100);
  const updatedPaid = Math.round((recordedPaid + (validAdditionalPayment ? paymentToAdd : 0)) * 100) / 100;
  const actionRemaining = Math.max(0, Math.round((actionOrderTotal - updatedPaid) * 100) / 100);
  const confirmOrderAction = async () => {
    const target = selectedActionOrder;
    if (!target || !orderAction || saving) return;
    setActionError('');
    if (orderAction.kind === 'complete') {
      if (target.status === 'Completed' || target.status === 'Fulfilled' || target.status === 'Cancelled') {
        setOrderAction(null);
        return;
      }
      if (!validAdditionalPayment) {
        setActionError('Enter an additional payment between ' + money(0) + ' and ' + money(Math.max(0, actionOrderTotal - recordedPaid)) + '.');
        return;
      }
      if (actionRemaining > 0.001 && !acknowledgePending) {
        setActionError('Please acknowledge the unpaid balance before completing this order.');
        return;      }
    }
    if ((orderAction.kind === 'cancel' || orderAction.kind === 'refund') && !validRefund) {
      setActionError('Refund must be between '+money(0)+' and '+money(refundable)+', with at most two decimal places.'); return;
    }
    if (orderAction.kind === 'cancel' && target.status === 'Cancelled') {
      setActionError('This order is already cancelled. Use Record refund instead.'); return;
    }
    if (orderAction.kind === 'refund' && target.status !== 'Cancelled') {
      setActionError('Refunds can only be recorded for cancelled orders.'); return;
    }
    if ((orderAction.kind === 'cancel' || orderAction.kind === 'refund') && refundNow > 0 &&
        (!validDate(refundDate) || refundDate > new Date().toISOString().slice(0,10))) {
      setActionError('Enter a valid refund date that is not in the future.'); return;
    }
    if (orderAction.kind === 'delete' && (target.paid>0 || refundedAmount(target)>0)) {
      setActionError('This paid order cannot be deleted. Keep it for payment and refund history.'); return;
    }
    try {
      let nextOrders: Order[];
      if(orderAction.kind === 'delete') nextOrders=data.orders.filter(o => o.id!==target.id);
      else if(orderAction.kind === 'complete') nextOrders=data.orders.map(o => o.id===target.id ? {...o,paid:updatedPaid,status:'Completed'} : o);
      else {
        const entry: RefundEntry|null = refundNow>0 ? {
          id:'RF-'+crypto.randomUUID().slice(0,8).toUpperCase(),
          amount:refundNow,date:refundDate,method:refundMethod,reference:refundReference.trim(),note:refundNote.trim()
        } : null;
        nextOrders=data.orders.map(o=>o.id===target.id ? {
          ...o,status:'Cancelled',cancelledAt:o.cancelledAt||new Date().toISOString(),
          cancelReason:orderAction.kind==='cancel'?refundNote.trim():o.cancelReason,
          refunded:Math.round((alreadyRefunded+refundNow)*100)/100,
          refundHistory:entry?[...(o.refundHistory||[]),entry]:(o.refundHistory||[])
        } : o);
      }
      await save({ ...data, orders: nextOrders });
      if(orderAction.kind==='complete') {
        const completed=nextOrders.find(order=>order.id===target.id);
        if(completed)setInvoiceOrder(completed);
      }
      setOrderAction(null);
      setActionError('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update order. Please retry.');
    }
  };
  const shownOrders = data.orders.filter(o =>
    (orderTab === 'All' ||
      (orderTab === 'Processing' && o.status !== 'Completed' && o.status !== 'Fulfilled' && o.status !== 'Cancelled') ||
      (orderTab === 'Completed' && (o.status === 'Completed' || o.status === 'Fulfilled')) ||
      (orderTab === 'Cancelled' && o.status === 'Cancelled')) &&
    (!ordersQuery.trim() ||
      [o.id, o.customer, ...orderItems(o).map(line=>line.name)].some(value =>
        value.toLowerCase().includes(ordersQuery.trim().toLowerCase())))
  );
  const recentOrders = data.orders
    .filter(o => !['Completed','Fulfilled','Cancelled'].includes(o.status))
    .slice(0, 5);
  const productMatches = data.products.filter(p =>
    (p.name + ' ' + p.sku).toLowerCase().includes(productQuery.trim().toLowerCase())
  ).slice(0, 12);
  const customerMatches = [...new Set([...customers.map(c=>c.name), ...data.orders.map(o => o.customer)])]
    .filter(name => form.customer?.trim() &&
      name.toLowerCase().includes(form.customer.trim().toLowerCase()) &&      name.toLowerCase() !== form.customer.trim().toLowerCase()).slice(0, 6);
  const change = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const orderDraftProduct = product(form.productId || '');
  const draftQuantity = Math.max(0, Number(form.qty) || 0);
  const draftSubtotal = Math.round(draftItems.reduce((sum,line)=>sum+line.unitPrice*line.qty,0)*100)/100;
  const draftShipping = Math.max(0, Number(form.shipping) || 0);
  const draftDiscountPercent = Math.max(0, Number(form.discount) || 0);
  const draftDiscount = Math.round(draftSubtotal * draftDiscountPercent) / 100;
  const draftTax = Math.max(0, Number(form.tax) || 0);
  const draftTotal = Math.max(0, Math.round((draftSubtotal + draftShipping + draftTax - draftDiscount) * 100) / 100);
  const draftPaid = Math.max(0, Number(form.paid) || 0);


  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(saving||productPhotoBusy)return;
    const f = form;
    const num = (k: string) => Number(f[k]);
    const fail=(message:string)=>setError(message);
    for(const key of ['date','scheduledDate']){
      if(f[key]&&!validDate(f[key])){fail('Enter a valid date (1900–2100).');return;}
    }
    if(modal==='Product'){
      if((f.name||'').trim().length>120||(f.sku||'').trim().length>80){fail('Name: max 120 characters. SKU: max 80.');return;}
      if(!validMoney(num('price'))||!validMoney(num('cost'))){fail('Enter valid price and cost with up to 2 decimals.');return;}
      if(['stock','min'].some(k=>!Number.isSafeInteger(num(k))||num(k)<0||num(k)>1000000000)){fail('Stock and threshold must be whole numbers.');return;}
    }
    if(modal==='Order'){
      if((f.customer||'').trim().length>120){fail('Customer name: max 120 characters.');return;}
      if(['shipping','tax','paid'].some(k=>f[k]!==undefined&&f[k]!==''&&!validMoney(num(k)))){fail('Amounts must be nonnegative, with up to 2 decimals.');return;}
      if(f.status&&!['New','Planned','Processing','Completed','Cancelled'].includes(f.status)){fail('Choose a valid order status.');return;}
    }
    if(modal==='Customer'){
      if(!validEmail(f.email||'')){fail('Enter a valid email address.');return;}
      if(!validPhone(f.phone||'')){fail('Enter a valid phone number (7–15 digits).');return;}
      if((f.name||'').trim().length>120||(f.email||'').length>254||(f.notes||'').length>2000||
        ['company','city','country','phone'].some(k=>(f[k]||'').length>120)||(f.address||'').length>250){fail('One or more customer fields are too long.');return;}
    }
    if(modal==='Note'&&((f.title||'').length>120||(f.body||'').length>4000)){fail('Title: max 120 characters. Note: max 4,000.');return;}
    if(modal==='Expense'&&(!validMoney(num('amount'))||num('amount')<=0||(f.name||'').length>120)){fail('Enter a description and positive amount (max 2 decimals).');return;}
    if(modal==='Post'&&(!['Instagram','Pinterest','TikTok','Facebook'].includes(f.platform)||!['Draft','Planned','Posted'].includes(f.status||'Planned')||(f.caption||'').length>2000)){fail('Choose a platform and status; caption max 2,000 characters.');return;}
    let next = { ...data };
    setError('');
    if (modal === 'Product') {
      if (!f.name?.trim() || !f.sku?.trim() ||
          ['price','cost','stock','min'].some(k => f[k] === undefined || f[k] === '')) {
        setError('Enter product name, unique SKU, price, cost, stock and restock threshold.');
        return;
      }
      if ([num('price'), num('cost'), num('stock'), num('min')].some(v => !Number.isFinite(v) || v < 0) ||
          !Number.isInteger(num('stock')) || !Number.isInteger(num('min'))) {
        setError('Price/cost must be zero or more; stock and threshold must be whole numbers.');
        return;
      }
      if (num('stock') < sold(editingId || '')) {
        setError('Starting stock cannot be below quantities already allocated to orders.');
        return;
      }
      if (data.products.some(p => p.id !== editingId && p.sku.toLowerCase() === f.sku.trim().toLowerCase())) {
        setError('Another product already uses this SKU.');
        return;
      }
      const updated:Product = {
        id: editingId || 'p'+crypto.randomUUID(),
        name:f.name.trim(),sku:f.sku.trim(),
        price:num('price'),cost:num('cost'),stock:num('stock'),min:num('min')
      };
      const existing=data.products.find(p=>p.id===updated.id);
      next.products=existing
        ? data.products.map(p=>p.id===updated.id?updated:p)
        : [...data.products,updated];
      try {
        await save(next);
        if(productPhotoDraft){
          const imageData=productPhotoDraft.split(',')[1];
          const result=await api.post('/api/product-image/'+encodeURIComponent(updated.id),{
            imageData,contentType:'image/jpeg'
          });
          if(!result.data.url)throw Error('Image was not returned by the server.');
          setProductImages(images=>({...images,[updated.id]:result.data.url}));
        } else if(productPhotoRemove){
          await api.delete('/api/product-image/'+encodeURIComponent(updated.id));
          setProductImages(images=>({...images,[updated.id]:null}));
        }
        setProductPhotoDraft(null);
        setProductPhotoRemove(false);
        setModal('');
      } catch(err) {
        setEditingId(updated.id);
        setError(err instanceof Error?err.message:'Could not save product.');
      }
      return;
    } else if(modal==='Order') {
      if(!f.customer?.trim() || draftItems.length===0) {
        setError('Enter a customer and select at least one product.');return;
      }
      if(draftItems.some(line=>!Number.isInteger(line.qty)||line.qty<=0||
          !Number.isFinite(line.unitPrice)||line.unitPrice<0||
          !data.products.some(p=>p.id===line.productId))) {
        setError('Each product must have a valid whole-number quantity and selling price.');return;
      }
      const previous=editingId?data.orders.find(o=>o.id===editingId):undefined;
      if(previous?.status==='Cancelled') {
        setError('Cancelled orders are locked; use refund management.');return;
      }
      for(const line of draftItems) {
        const p=product(line.productId)!;
        const returned=previous && previous.status!=='Cancelled'
          ? orderItems(previous).filter(old=>old.productId===line.productId).reduce((sum,old)=>sum+old.qty,0) : 0;
        const allowed=available(p)+returned;
        if(line.qty>allowed){
          setError('Insufficient stock for '+p.name+'. Available for this order: '+allowed);
          return;
        }
      }
      if(f.paid===undefined || f.paid.trim()===''){
        setError('Enter the received amount, or 0 if unpaid.');return;
      }
      const subtotal=Math.round(draftItems.reduce((sum,line)=>sum+line.qty*line.unitPrice,0)*100)/100;
      const extra=['shipping','tax','discount'].map(k=>f[k]===undefined||f[k]===''?0:Number(f[k]));
      if(extra.some(n=>!Number.isFinite(n)||n<0)||!Number.isFinite(num('paid'))){
        setError('Shipping, tax, discount and payment must be valid nonnegative numbers.');return;
      }
      const [shipping,tax,discountPercent]=extra;
      if(discountPercent>100){setError('Discount percentage must be between 0 and 100.');return;}
      const discount=Math.round(subtotal*discountPercent)/100;
      const finalTotal=Math.round((subtotal+shipping+tax-discount)*100)/100;
      if(num('paid')<0||num('paid')>finalTotal+0.001){
        setError('Payment received must be from '+money(0)+' to '+money(finalTotal)+'.');return;
      }
      if(f.status==='Cancelled'){        if(!previous){setError('Save the order first, then cancel it.');return;}
        setModal('');openOrderAction('cancel',previous);return;
      }
      if(f.status==='Planned' && !f.scheduledDate){
        setError('Choose a scheduled date for the planned order.');return;
      }
      const items=draftItems.map(line=>({...line}));
      if(!validMoney(finalTotal)||!validMoney(num('paid'))){setError('Order total or payment exceeds the allowed amount.');return;}
      if(previous&&num('paid')+0.001<previous.paid){setError('Payment cannot be reduced. Use refund management.');return;}
      const order:Order={
        ...previous,
        id:editingId||'ORD-'+crypto.randomUUID().slice(0,8).toUpperCase(),
        customer:f.customer.trim(),productId:items[0].productId,
        qty:items.reduce((sum,line)=>sum+line.qty,0),items,
        paid:num('paid'),total:finalTotal,unitPrice:items[0].unitPrice,
        shipping,tax,discount,discountPercent,
        status:f.status||'New',date:previous?.date||new Date().toISOString().slice(0,10),
        scheduledDate:f.scheduledDate||undefined
      };
      next.orders=editingId?data.orders.map(o=>o.id===editingId?order:o):[order,...data.orders];
    } else if(modal==='Customer') {
      if(!f.name?.trim()){setError('Customer name is required.');return;}
      const customer:Customer={id:editingId||'c'+crypto.randomUUID(),name:f.name.trim(),email:(f.email||'').trim(),phone:(f.phone||'').trim(),company:(f.company||'').trim(),address:(f.address||'').trim(),city:(f.city||'').trim(),country:(f.country||'').trim(),notes:(f.notes||'').trim()};
      if(data.customers?.some(c=>c.id!==editingId&&c.name.toLowerCase()===customer.name.toLowerCase())){setError('A customer with that name already exists.');return;}
      next.customers=editingId?(data.customers||[]).map(c=>c.id===editingId?customer:c):[...(data.customers||[]),customer];
    } else if(modal==='Note') {
      if(!f.title?.trim()||!f.body?.trim()){setError('Enter a note title and content.');return;}
      const note:Note={id:editingId||'n'+crypto.randomUUID(),title:f.title.trim(),body:f.body.trim(),date:f.date||new Date().toISOString().slice(0,10),important:f.important==='true'};
      next.notes=editingId?(data.notes||[]).map(n=>n.id===editingId?note:n):[note,...(data.notes||[])];
    } else if (modal === 'Expense') {
      if (!f.name?.trim() || !(num('amount') > 0)) {
        setError('Enter an expense name and positive amount.');
        return;
      }
      next.expenses = [
        {
          id: 'e' + Date.now(),
          name: f.name.trim(),          amount: num('amount'),
          date: f.date || new Date().toISOString().slice(0, 10),
        },
        ...data.expenses,
      ];
    } else if (modal === 'Post') {
      if (!f.platform || !f.caption?.trim() || !f.date) {
        setError('Complete platform, caption and date.');
        return;
      }
      next.posts = [
        {
          id: 's' + Date.now(),          platform: f.platform,
          caption: f.caption.trim(),          date: f.date,          status: f.status || 'Planned',
        },
        ...data.posts,
      ];
    }
    try { await save(next); setModal(''); } catch (err) { setError(err instanceof Error ? err.message : 'Save failed.'); }
  };
  const goto = (p: string) => {
    if (p !== page) {
      setInAppNavigation(true);
      window.location.hash = encodeURIComponent(p);
      setPage(p);
    }
    setMobile(false);
  };
  const todayLocal=()=>{
    const now=new Date();
    return new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,10);
  };
  const today=todayLocal();
  const inDays=(days:number)=>{
    const date=new Date(today+'T12:00:00');
    date.setDate(date.getDate()+days);
    return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
  };
  const plannedOrders=data.orders.filter(o=>
    o.status==='Planned' && !!o.scheduledDate).sort((a,b)=>(a.scheduledDate||'').localeCompare(b.scheduledDate||''));
  const orderReminders=plannedOrders.filter(o=>(o.scheduledDate||'')<=inDays(7));
  const importantNotes=(data.notes||[]).filter(n=>n.important).sort((a,b)=>a.date.localeCompare(b.date));
  const upcomingPosts=data.posts.filter(p=>p.status!=='Posted' && p.date>=today && p.date<=inDays(14))
    .sort((a,b)=>a.date.localeCompare(b.date));
  const upcomingOrders=plannedOrders.filter(o=>(o.scheduledDate||'')>=today && (o.scheduledDate||'')<=inDays(14));
  const reminderCount=orderReminders.length;
  const globalResults=(()=>{
    const query=globalQuery.trim().toLowerCase();
    if(!query)return [] as Array<{id:string;kind:string;title:string;detail:string;page:string}>;
    return [
      ...data.orders.filter(o=>[o.id,o.customer,...orderItems(o).map(i=>i.name)]
        .some(v=>v.toLowerCase().includes(query))).map(o=>({id:'order-'+o.id,kind:'Order',title:o.customer,detail:o.id+' · '+o.status,page:'Orders'})),
      ...data.products.filter(p=>(p.name+' '+p.sku).toLowerCase().includes(query))
        .map(p=>({id:'product-'+p.id,kind:'Product',title:p.name,detail:p.sku,page:'Products'})),
      ...customers.filter(c=>(c.name+' '+c.email+' '+c.phone).toLowerCase().includes(query))
        .map(c=>({id:'customer-'+c.id,kind:'Customer',title:c.name,detail:c.email||c.phone,page:'Customers'})),
      ...(data.notes||[]).filter(n=>(n.title+' '+n.body).toLowerCase().includes(query))
        .map(n=>({id:'note-'+n.id,kind:'Note',title:n.title,detail:n.date,page:'Content Planner'})),
      ...data.posts.filter(p=>(p.caption+' '+p.platform).toLowerCase().includes(query))
        .map(p=>({id:'post-'+p.id,kind:'Scheduled post',title:p.caption,detail:p.date,page:'Content Planner'}))
    ].slice(0,12);
  })();
  const navigateSearch=(result:{kind:string;title:string;page:string})=>{
    setGlobalSearchOpen(false);
    if(result.page==='Orders')setOrdersQuery(globalQuery);
    if(result.page==='Products')setCatalogQuery(globalQuery);
    goto(result.page);
  };
  const goBack = () => {
    if (inAppNavigation) window.history.back();
    else goto('Dashboard');
  };
  const pricingP = product(calcId);
  const subtotal = (pricingP?.cost || 0) + pack + ship + desired + fixed;
  const recommended =
    fee >= 100 ? NaN : Math.ceil((subtotal / (1 - fee / 100)) * 100) / 100;
  const stat = (
    title: string,
    value: string,
    icon: React.ReactNode,
    foot: string
  ) => (
    <div className="stat">
      <div className="stat-top">
        <span>{title}</span>
        <span className="stat-controls">
          <button type="button" className="stat-eye-button"
            title={hiddenMetrics[title] === false ? 'Hide '+title : 'Show '+title}
            aria-label={hiddenMetrics[title] === false ? 'Hide '+title : 'Show '+title}
            aria-pressed={hiddenMetrics[title] === false}
            onClick={()=>toggleMetric(title)}>
            {hiddenMetrics[title] === false ? <EyeOff size={18}/> : <Eye size={18}/>}
          </button>
        </span>
      </div>
      <div className={'stat-value'+(hiddenMetrics[title] !== false ? ' stat-masked':'')}>
        {hiddenMetrics[title] === false ? value : <span className="stat-hidden-line" aria-label="Amount hidden"/>}
      </div>
      <div className="stat-foot">{foot}</div>
    </div>
  );
  if (!authReady) return <div className="auth-page"><div className="auth-card"><h1>Loading your account…</h1><p>Restoring your secure session.</p></div></div>;
  if (loadError) return <div className="auth-page"><div className="auth-card"><h1>Unable to load your workspace</h1><p>{loadError}</p><button className="primary" onClick={() => window.location.reload()}>Try again</button><button className="textbtn" onClick={async () => { await auth.signOut(); window.location.reload(); }}>Sign out</button></div></div>;
  if (!user) return <div className="auth-page"><div className="auth-card"><div className="auth-logo">C</div><div className="eyebrow">SMALL BUSINESS COMMAND CENTER</div><h1>Your business. One simple workspace.</h1><p>Manage orders, products, customer payments and your business profile from any device.</p><button className="primary full" onClick={async () => { try { await auth.signInWithRedirect(); } catch (err) { setLoadError(err instanceof Error ? err.message : 'Sign in failed.'); } }}>Sign in / Create account</button><small>New accounts start empty. Existing browser demo data will not be imported automatically.</small></div></div>;
  if (licenseGate && user) return (
    <div className="auth-page"><div className="auth-card" style={{maxWidth:470}}>
      <div className="auth-logo"><KeyRound size={25}/></div>
      <h1>License & device access</h1>
      <p>{pilotLicense?.licenseStatus==='revoked'
        ? 'This license has been revoked. Contact the seller for support.'
        : pilotLicense?.licenseDeviceId
          ? 'This license is active on another installation. Release it there, or request a verified device reset.'
          : pilotLicense?.licensed
            ? 'Your purchased license needs device activation.'
            : 'A purchased license key is required before you can access your business workspace.'}</p>
      {!pilotLicense?.licensed && (
        <div className="license-redeem">
          <label className="field"><span>License key</span>
            <input autoComplete="off" spellCheck={false}
              placeholder="SBCC-XXXXXXXX-..." value={licenseKeyInput}
              aria-invalid={licenseActionError} aria-describedby={licenseActionError?'license-activation-error':undefined}
              onChange={e=>{setLicenseKeyInput(e.target.value);setLicenseActionError(false);setLicenseActionMessage('');}}/>
          </label>
          <button type="button" className="primary full"
            disabled={licenseActionBusy||!licenseKeyInput.trim()}
            onClick={()=>void commercialLicenseAction('redeem')}>Activate purchased license</button>
        </div>
      )}
      {pilotLicense?.licenseStatus==='active' && !pilotLicense?.licenseDeviceId &&
        <button type="button" className="primary full" disabled={licenseActionBusy} onClick={()=>void commercialLicenseAction('transfer')}>Activate this browser</button>}
      <button type="button" className="textbtn" disabled={licenseActionBusy} onClick={()=>void reloadWithLicense()}>Refresh license status</button>
      {licenseActionMessage && <p id="license-activation-error" role={licenseActionError?'alert':'status'} style={licenseActionError?{color:'#dc2626',fontWeight:600}:undefined}>{licenseActionMessage}</p>}
      <button type="button" className="textbtn" onClick={async()=>{await auth.signOut();window.location.reload();}}>Sign out</button>
    </div></div>
  );
  return (
    <div className={"shell theme-" + theme + (sidebarCollapsed ? " sidebar-is-collapsed" : "")}>
      <aside id="workspace-navigation" className={'sidebar ' + (mobile ? 'show' : '')}>
        <div className="brand">
          <div className="brand-mark">C</div>
          <div>            <strong>Command Center</strong>
            <small>BUSINESS, SIMPLIFIED</small>          </div>
        </div>
        <div className="navlabel">WORKSPACE</div>
        {nav.map(([name, Icon]) => (
          <button
            key={name}
            className={'nav ' + (page === name ? 'active' : '')}
            onClick={() => goto(name)}
          >
            <Icon size={18} />
            {name}
          </button>
        ))}
        <div className="sidebottom">
                    <div className="demo-pill"><span className="pulse" /> Account workspace</div>
          <small className="workspace-disclaimer">Financial estimates only.</small>
          <button className="textbtn" onClick={() => goto('Profile')}>Manage profile</button>
          <button
            className="textbtn"
            onClick={() => {
              if (window.confirm('Clear all records to start empty?')) {
                void save(blank).then(() => goto('Dashboard')).catch(err => window.alert('Could not clear records: ' + String(err)));
              }
            }}
          >
            Clear all records
          </button>
        </div>
      </aside>
      {mobile && (
        <button
          className="overlay"
          onClick={() => setMobile(false)}
          aria-label="Close menu"
        />
      )}
      <main>
        <div className="workspace-header">
          <header className="workspace-toolbar">
          <button
            type="button"
            className="sidebar-toggle"
            onClick={toggleSidebar}
            aria-controls="workspace-navigation"
            aria-label={mobile ? 'Close sidebar' : sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
            aria-expanded={window.matchMedia('(max-width: 900px)').matches ? mobile : !sidebarCollapsed}
            title={mobile ? 'Close sidebar' : sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
          >
            {mobile || (!sidebarCollapsed && !window.matchMedia('(max-width: 900px)').matches)
              ? <ArrowLeft size={21} />
              : <Menu size={21} />}
          </button>
          {logoUrl ? (
            <button className="header-business-logo header-business-logo-button" type="button"
              title="View business logo" aria-label="View business logo" onClick={() => setLogoPreviewOpen(true)}>
              <img src={logoUrl} alt="Business logo"/>
            </button>
          ) : (
            <label className="header-business-logo" title="Upload business logo">
              <Plus size={20}/>
              <input type="file" hidden accept="image/jpeg,image/png,image/webp"
                onChange={uploadLogo} disabled={logoBusy}/>
              <span className="logo-caption">{logoBusy?'Uploading…':'LOGO'}</span>
            </label>
          )}
          <div className="header-title">
            <div className="eyebrow">YOUR WORKSPACE / {page.toUpperCase()}</div>
            <h1>
              {page === 'Dashboard' ? 'Welcome back, ' + (profile.displayName?.trim() || user.name || 'there') + ' 👋' : page}
            </h1>
          </div>
          <div className="global-search" ref={globalSearchRef}>
            <Search size={18}/>
            <input type="search" placeholder="Search orders, products, customers…"
              aria-label="Search business records" value={globalQuery}
              onFocus={()=>setGlobalSearchOpen(true)}
              onChange={event=>{setGlobalQuery(event.target.value);setGlobalSearchOpen(true);}}/>
            {globalQuery&&<button type="button" className="global-search-clear" aria-label="Clear search"
              onClick={()=>{setGlobalQuery('');setGlobalSearchOpen(false);}}><X size={16}/></button>}
            {globalSearchOpen&&globalQuery.trim()&&(
              <div className="global-search-popover" role="listbox" aria-label="Live search results">
                {globalResults.length?globalResults.map(result=><button type="button" key={result.id}
                  className="global-search-result" onClick={()=>navigateSearch(result)}>
                  <span className="global-search-kind">{result.kind}</span>
                  <span className="global-search-text"><b>{result.title}</b><small>{result.detail}</small></span>
                  <ChevronRight size={16}/>
                </button>):<p className="global-search-empty">No matching records</p>}
              </div>
            )}
          </div>
          <div className="header-actions" ref={headerMenuRef}>
            <div className="header-menu-anchor">
              <button type="button" className="theme-toggle notification-toggle" title="Planned order notifications"
                aria-label={'Notifications: '+reminderCount+' planned orders due soon'}
                aria-expanded={headerMenu==='notifications'}
                onClick={()=>setHeaderMenu(menu=>menu==='notifications'?null:'notifications')}>
                <Bell size={21}/>
                {reminderCount>0&&<span className="notification-count">{reminderCount>9?'9+':reminderCount}</span>}
              </button>
              {headerMenu==='notifications'&&<div className="header-popup notification-popup">
                <div className="notification-heading"><b>Planned order reminders</b><small>{reminderCount} due soon / overdue</small></div>
                {orderReminders.length ? orderReminders.slice(0,10).map(order=>
                  <button type="button" key={order.id} className="notification-item" onClick={()=>{
                    setHeaderMenu(null);setOrdersQuery(order.id);goto('Orders');}}>                    <Clock3 size={17}/>
                    <span><b>{order.customer}</b>
                      <small>{order.id} · {order.scheduledDate} · {order.scheduledDate!<today?'Overdue':'Due soon'}</small>
                    </span>
                  </button>) : <p className="notification-empty">No planned orders due within 7 days.</p>}
                <button type="button" className="notification-view-all" onClick={()=>{setHeaderMenu(null);setOrdersQuery('');goto('Orders');}}>
                  View all orders <ChevronRight size={16}/>
                </button>
              </div>}
            </div>
            <div className="header-menu-anchor">
              <button type="button" className="theme-toggle" aria-label="Change theme"
                title="Change theme" aria-expanded={headerMenu === 'theme'}
                onClick={() => setHeaderMenu(m => m === 'theme' ? null : 'theme')}><Palette size={21}/></button>
              {headerMenu === 'theme' && <div className="header-popup theme-popup" aria-label="Appearance options">
                <div className="theme-heading">Appearance</div>
                {([
                  {id:'light' as const, label:'Light', Icon:Sun},
                  {id:'dark' as const, label:'Dark', Icon:Moon},
                  {id:'warm' as const, label:'Warm', Icon:Palette}
                ]).map(option => <button type="button" className="theme-option" key={option.id} aria-pressed={theme === option.id}
                  onClick={() => { setTheme(option.id); setHeaderMenu(null); }}>
                  <span className={'theme-swatch ' + option.id}><option.Icon size={17}/></span>
                  <b>{option.label}</b>{theme === option.id && <CheckCircle2 size={16}/>}
                </button>)}
              </div>}
            </div>
            <div className="header-menu-anchor">
              <button className="avatar" type="button" title="Account" aria-label="Open account menu"
                aria-expanded={headerMenu === 'account'} onClick={() => setHeaderMenu(m => m === 'account' ? null : 'account')}>
                {avatarImage('small')}
              </button>
              {headerMenu === 'account' && <div className="header-popup account-popup" role="menu" aria-label="Account menu">
                <div className="account-banner">
                  <div className="account-portrait">{avatarImage('large')}</div>
                  <div className="account-name">{profile.displayName || user.name || 'My Account'}</div>
                  <div className="account-email">{user.email || profile.businessName || ''}</div>                </div>
                <button type="button" role="menuitem" className="account-option"
                  onClick={() => { setHeaderMenu(null); goto('Profile'); }}><UserCircle size={18}/> Profile</button>
                <button type="button" role="menuitem" className="account-option"
                  onClick={() => { setHeaderMenu(null); setCurrencyModal(true); setCurrencyTarget(profile.currency); setFxQuote(null); setCurrencyError(''); }}><Wallet size={18}/> Change Currency</button>
                <button type="button" role="menuitem" className="account-option danger"
                  onClick={async () => {
                    setHeaderMenu(null);
                    try { await auth.signOut(); setUser(null); setData(blank); window.location.hash = ''; }
                    catch (err) { window.alert(err instanceof Error ? err.message : 'Could not sign out.'); }
                  }}><LogOut size={18}/> Log Out</button>
              </div>}
            </div>
          </div>
          </header>
        </div>
        <section className="content">


          {saving && <div className="notice">Saving your changes…</div>}
          {page === 'Profile' && (
            <>
              <div className="profile-layout">
                <div className="panel profile-business-panel">
                  <div className="profile-panel-heading">
                    <h2>My profile & business</h2>
                    
                  </div>
                  {profileMessage && <p className="profile-message" role="status">{profileMessage}</p>}
                  <form onSubmit={saveProfile} className="profile-edit-form">
                    <div className="profile-edit-row">
                      <div className="profile-edit-media">
                        <div className="profile-edit-avatar">{avatarImage('large')}</div>
                        <label className="profile-edit-camera" title="Upload or change profile image">
                          <Camera size={18}/>
                          <input type="file" hidden accept="image/jpeg,image/png,image/webp"
                            onChange={uploadAvatar} disabled={avatarBusy}/>
                        </label>
                      </div>
                      <div className="profile-edit-field">
                        <label className="field">
                          <span>Display name</span>
                          <input maxLength={80} value={profile.displayName}
                            onChange={e=>setProfile(v=>({...v,displayName:e.target.value}))}/>
                        </label>
                        
                      </div>
                    </div>
                    {avatarUrl && <button type="button" className="profile-media-remove" disabled={avatarBusy}
                      onClick={()=>void removeAvatar()}>Remove profile image</button>}
                    <div className="profile-edit-row">
                      <div className="profile-edit-media">
                        {logoUrl ? (
                          <button className="profile-business-logo-preview" type="button"
                            title="View business logo" aria-label="View business logo"
                            onClick={()=>setLogoPreviewOpen(true)}>
                            <img src={logoUrl} alt="Business logo"/>
                          </button>
                        ) : (
                          <label className="profile-business-logo-upload" title="Add business logo">
                            <Plus size={24}/><span>LOGO</span>
                            <input type="file" hidden accept="image/jpeg,image/png,image/webp"
                              onChange={uploadLogo} disabled={logoBusy}/>
                          </label>
                        )}
                      </div>
                      <div className="profile-edit-field">
                        <label className="field">
                          <span>Business name</span>
                          <input required maxLength={80} value={profile.businessName}
                            onChange={e=>setProfile(v=>({...v,businessName:e.target.value}))}/>
                        </label>
                        
                      </div>
                    </div>
                    <label className="field">
                      <span>Business type</span>
                      <select value={profile.businessType}
                        onChange={e=>setProfile(v=>({...v,businessType:e.target.value}))}>
                        {['Handmade products','Online retail','Freelance','Other'].map(v=><option key={v}>{v}</option>)}
                      </select>
                    </label>
                    <button type="button" className="security-button profile-password-action"
                      onClick={()=>setPasswordHelp(true)}>
                      <KeyRound size={18}/> Change Password <ChevronRight size={16}/>
                    </button>
                    <button type="submit" className="primary profile-save-button" disabled={saving}>                      {saving?'Saving…':'Save profile'}
                    </button>
                  </form>
                </div>
                <div className="panel">
                  <h3>Account & security</h3>
                  <p className="muted">Signed in as</p>
                  <strong>{user.email || user.name || 'Authenticated user'}</strong>
                  <p className="muted">Account role: <b>{verifiedRole === 'checking' ? 'Checking…' : verifiedRole === 'customer' ? 'Customer' : verifiedRole.charAt(0).toUpperCase()+verifiedRole.slice(1)}</b></p>
                  <button type="button" className="textbtn" onClick={() => void refreshVerifiedRole()}>Refresh account role</button>
                  {roleFeedback && <p className="muted" role="status">{roleFeedback}</p>}
                  <p className="muted">Currency: <b>{currencyCode}</b></p>
                  <div className="pilot-license-panel" aria-label="License pilot settings">
                    <h4>License & installation</h4>
                    <p className="muted">{pilotLicense?.licensed ? 'Purchased single-person license · one active installation' : 'Pilot setup · no paid license required yet.'}</p>
                    {pilotLicense?.licensed ? (
                      <>
                        <p><strong>Purchased license:</strong> {pilotLicense.licenseStatus==='active'?'Active':pilotLicense.licenseStatus}</p>
                        <p className="muted">{pilotLicense.licenseDeviceId===localStorage.getItem('command_pilot_installation_'+user.userId)?'This browser is the active installation.':pilotLicense.licenseDeviceId?'Another installation is active.':'No active device.'}</p>
                        {pilotLicense.licenseStatus==='active' && pilotLicense.licenseDeviceId===localStorage.getItem('command_pilot_installation_'+user.userId) &&
                          <button className="security-button" type="button" disabled={licenseActionBusy} onClick={()=>void commercialLicenseAction('release')}>Release this installation</button>}
                        {pilotLicense.licenseStatus==='active' && !pilotLicense.licenseDeviceId &&
                          <button className="security-button" type="button" disabled={licenseActionBusy} onClick={()=>void commercialLicenseAction('transfer')}>Activate this installation</button>}
                      </>
                    ) : (
                      <div className="license-redeem">
                        <label className="field"><span>Purchase license key (optional during pilot)</span>
                          <input autoComplete="off" spellCheck={false} placeholder="SBCC-XXXXXXXX-..." value={licenseKeyInput} onChange={e=>setLicenseKeyInput(e.target.value)} /></label>
                        <button className="security-button" type="button" disabled={licenseActionBusy||!licenseKeyInput.trim()} onClick={()=>void commercialLicenseAction('redeem')}>Redeem purchased license</button>
                      </div>
                    )}
                    {licenseActionMessage && <p role={licenseActionError?'alert':'status'} className={licenseActionError?'formerror':'muted'} style={licenseActionError?{color:'#dc2626',fontWeight:600}:undefined}>{licenseActionMessage}</p>}
                    {!pilotLicense?.licensed && <p><strong>Pilot status:</strong> {pilotLicense?.status === 'pilot' ? 'Pilot registered' : pilotLicense?.status === 'revoked' ? 'Revoked' : pilotLicense ? 'Not registered' : 'Checking…'}</p>}
                    {!pilotLicense?.licensed && pilotLicense?.status === 'pilot' && <p className="muted">{pilotLicense.activeDeviceId === localStorage.getItem('command_pilot_installation_'+user.userId) ? 'This browser is active.' : pilotLicense.deviceActive ? 'Another browser is registered.' : 'No active browser.'}</p>}
                    {!pilotLicense?.licensed && pilotLicense?.status !== 'revoked' && pilotLicense && (
                      pilotLicense.activeDeviceId === localStorage.getItem('command_pilot_installation_'+user.userId)
                      ? <button type="button" className="security-button" disabled={pilotLicenseBusy} onClick={() => void updatePilotLicense('deactivate')}>Deactivate this browser</button>
                      : !pilotLicense.deviceActive
                        ? <button type="button" className="security-button" disabled={pilotLicenseBusy} onClick={() => void updatePilotLicense('activate')}>Register this browser</button>
                        : <p className="muted">To switch browsers, deactivate the previous browser first.</p>
                    )}
                    {pilotLicenseMessage && <p role="status" className="muted">{pilotLicenseMessage}</p>}
                  </div>
                  {isLicenseAdmin && <div className="pilot-license-panel">
                    <h4>License administration</h4>
                    <p className="muted">Issue one-time license keys for verified buyer emails. Only the owner or authorized admin can access this panel.</p>
                    <label className="field"><span>Buyer email</span>
                      <input type="email" autoComplete="off" maxLength={254} placeholder="buyer@example.com" value={adminLicenseEmail} onChange={e=>setAdminLicenseEmail(e.target.value)}/></label>
                    <button className="security-button" type="button" disabled={adminLicenseBusy||!adminLicenseEmail.trim()} onClick={()=>void issueAdminLicense()}>Issue license key</button>
                    {adminLicenseKey && <div className="license-created">
                      <p><strong>New license key — shown once. Copy it now.</strong></p>
                      <code style={{overflowWrap:'anywhere'}}>{adminLicenseKey}</code>
                      <button type="button" className="security-button" onClick={()=>void navigator.clipboard.writeText(adminLicenseKey)}>Copy key</button>
                    </div>}
                    <button type="button" className="security-button" disabled={adminLicenseBusy} onClick={()=>void loadAdminLicenses()}>Load customer licenses</button>
                    {adminLicenseError && <p role="alert" className="formerror">{adminLicenseError}</p>}
                    {adminLicenses.map(item=><div className="license-admin-item" key={item.id}>
                      <div><strong>{item.buyerEmail}</strong><p className="muted">{item.status} · {item.id.slice(0,12)}…</p></div>
                      <div className="action-buttons">
                        {item.status==='claimed' && <button className="security-button" type="button" disabled={adminLicenseBusy} onClick={()=>void manageAdminLicense(item.id,'reset')}>Reset device</button>}
                        {item.status!=='revoked' && <button className="security-button" type="button" disabled={adminLicenseBusy} onClick={()=>void manageAdminLicense(item.id,'revoke')}>Revoke</button>}
                      </div>
                    </div>)}
                    {adminLicenseMore && <p className="muted">Showing first 50 licenses. Additional licenses require pagination.</p>}
                  </div>}
                  {lastConversion && <p className="muted">{lastConversion}</p>}
                  <button className="signout" onClick={async () => {
                    await auth.signOut();setUser(null);setData(blank);window.location.hash='';
                  }}><LogOut size={17}/> Sign out</button>
                </div>
              </div>
            </>
          )}
          {page === 'Dashboard' && (            <>
              <div className="sectionhead">
                <div>
                  <h2>Business overview</h2>
                  
                </div>
                <button className="primary" onClick={() => open('Order')}>
                  <Plus size={17} /> New order
                </button>
              </div>
              <div className="stats">
                {stat(
                  'Gross order value',
                  money(sales),
                  <ShoppingBag size={19} />,
                  data.orders.length + ' orders'
                )}
                {stat(
                  'Net payments received',
                  money(received),
                  <Wallet size={19} />,
                  'Received minus refunds issued'
                )}
                {stat(
                  'Estimated cash contribution',                  money(profit),
                  <ArrowUpRight size={19} />,
                  'Received − product costs − expenses'
                )}
                {stat(                  'Outstanding payments',
                  money(outstanding),
                  <AlertCircle size={19} />,
                  'Uncollected order balances'
                )}
              </div>
              <div className="twocol">
                <div className="panel">
                  <div className="panelheader">
                    <h3>Recent orders</h3>
                    <button className="link" onClick={() => goto('Orders')}>View all →</button></div>                  {recentOrders.length ? <div className="recent-table-scroll"><table className="recent-orders-table">
                    <thead><tr><th>Customer / Order</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>{recentOrders.map(o => <tr key={o.id}>
                      <td><b>{o.customer}</b><small>{orderItems(o).map(line=>line.name).join(', ')} · {o.id}</small></td>
                      <td>{money(orderTotal(o))}</td><td><span className="status">{o.status}</span></td>
                      <td><div className="action-buttons">
  {(o.status === 'Completed' || o.status === 'Fulfilled') && (
    <button type="button" className="icon-action" title="Preview / print invoice"
      aria-label={'Preview and print invoice '+o.id}
      onClick={() => setInvoiceOrder(o)}><Printer size={17}/></button>
  )}
  {o.status !== 'Cancelled' && (
    <button type="button" className="icon-action" title="Edit order"
      aria-label={'Edit order '+o.id} disabled={saving}
      onClick={() => editOrder(o)}><Pencil size={17}/></button>
  )}
  {!['Completed','Fulfilled','Cancelled'].includes(o.status) && (
    <button type="button" className="complete-action" title="Review payment and complete order"
      aria-label={'Review payment and complete order '+o.id} disabled={saving}
      onClick={() => openOrderAction('complete', o)}><CheckCircle2 size={17}/></button>
  )}
  {(o.status !== 'Cancelled' || refundDue(o) > 0.001) && (
    <button type="button" className="refund-action"
      title={o.status === 'Cancelled' ? 'Record refund' : 'Cancel order and review refund'}
      aria-label={'Cancel or refund order '+o.id} disabled={saving}
      onClick={() => openOrderAction(o.status === 'Cancelled' ? 'refund' : 'cancel', o)}><RotateCcw size={17}/></button>
  )}
  {o.paid <= 0 && refundedAmount(o) <= 0 && (
    <button type="button" className="delete-action" title="Delete order"
      aria-label={'Delete order '+o.id} disabled={saving}
      onClick={() => openOrderAction('delete', o)}><Trash2 size={17}/></button>
  )}
</div></td>
                    </tr>)}</tbody>
                  </table></div> : <p className="empty">No active orders. Completed orders are available under Orders → Completed.</p>}
                </div>
                <div className="panel">
                  <div className="panelheader">
                    <h3>Needs your attention</h3>
                    <span className="orange-tag">Action center</span>
                  </div>

                  {data.products
                    .filter(p => available(p) <= p.min)
                    .map(p => (
                      <div className="alertrow" key={p.id}>
                        <AlertCircle size={18} />
                        <span>
                          <b>{p.name}</b>
                          <small>
                            Only {available(p)} available · minimum {p.min}
                          </small>
                        </span>
                      </div>
                    ))}
                  {refundPending > 0 && (
                    <div className="alertrow">
                      <RotateCcw size={18}/>
                      <span><b>Refunds pending</b><small>{money(refundPending)} due for cancelled orders</small></span>
                    </div>
                  )}
                  {outstanding > 0 && (
                    <div className="alertrow">
                      <Wallet size={18} />
                      <span>
                        <b>Pending payments</b>
                        <small>{money(outstanding)} still to collect</small>
                      </span>
                    </div>
                  )}
                  {!data.products.some(p => available(p) <= p.min) &&
                    outstanding === 0 && refundPending === 0 && (
                      <p className="empty">All clear for now.</p>
                    )}
                </div>
              </div>
              <div className="dashboard-reminders-grid">
                <div className="panel reminder-dashboard-panel">
                  <div className="panelheader">                    <h3><Star size={19}/> Important notes</h3>
                    <button type="button" className="link" onClick={()=>goto('Content Planner')}>View notes</button>
                  </div>
                  {importantNotes.length?importantNotes.slice(0,5).map(note=>
                    <button className="dashboard-reminder-item" type="button" key={note.id} onClick={()=>editNote(note)}>
                      <Star size={17}/>
                      <span><b>{note.title}</b><small>{note.date} · {note.body.length>100?note.body.slice(0,100)+'…':note.body}</small></span>
                    </button>):<p className="empty">No important notes.</p>}
                </div>
                <div className="panel reminder-dashboard-panel">
                  <div className="panelheader">
                    <h3><CalendarDays size={19}/> Upcoming schedule</h3>
                    <small>Next 14 days</small>
                  </div>
                  {upcomingOrders.length+upcomingPosts.length>0 ? [
                    ...upcomingOrders.map(order=>({id:'o-'+order.id,date:order.scheduledDate||'',title:order.customer,
                      meta:'Planned order · '+order.id,page:'Orders'})),
                    ...upcomingPosts.map(post=>({id:'p-'+post.id,date:post.date,title:post.caption,
                      meta:post.platform+' · '+post.status,page:'Content Planner'}))
                  ].sort((a,b)=>a.date.localeCompare(b.date)).slice(0,7).map(item=>
                    <button type="button" className="dashboard-reminder-item" key={item.id} onClick={()=>{
                      if(item.page==='Orders')setOrdersQuery(item.id.slice(2));
                      goto(item.page);
                    }}>
                      <CalendarDays size={17}/><span><b>{item.title}</b>
                        <small>{item.date} · {item.meta}</small></span>
                    </button>):<p className="empty">No upcoming activities.</p>}
                </div>
              </div>
              <div className="panel quick">
                <div>
                  <h3>Quick actions</h3>
                  
                </div>
                <div className="quickbuttons">
                  <button onClick={() => open('Product')}>                    <Package size={18} /> Add product
                  </button>
                  <button onClick={() => open('Expense')}>
                    <Wallet size={18} /> Add expense                  </button>
                  <button onClick={() => goto('Pricing Lab')}>
                    <Calculator size={18} /> Calculate price
                  </button>
                  <button onClick={() => open('Post')}>
                    <CalendarDays size={18} /> Plan a post
                  </button>
                </div>
              </div>
            </>
          )}
          {page === 'Orders' && (
            <>
              <div className="sectionhead">
                <div><h2>All orders</h2></div>
                <button className="primary" onClick={() => open('Order')}><Plus size={17}/> Add order</button>
              </div>
              <div className="order-tabs" role="tablist" aria-label="Order status filters">
                {(['All', 'Processing', 'Completed', 'Cancelled'] as const).map(tab => (
                  <button type="button" role="tab" key={tab} aria-selected={orderTab === tab}
                    className={'order-tab ' + (orderTab === tab ? 'selected' : '')} onClick={() => setOrderTab(tab)}>
                    {tab}
                    <span className="tab-count">{tab === 'All' ? data.orders.length :
                      tab === 'Completed' ? data.orders.filter(o => o.status === 'Completed' || o.status === 'Fulfilled').length :
                      tab === 'Cancelled' ? data.orders.filter(o => o.status === 'Cancelled').length :
                      data.orders.filter(o => o.status !== 'Completed' && o.status !== 'Fulfilled' && o.status !== 'Cancelled').length}</span>
                  </button>
                ))}
              </div>
              <div className="order-search-wrap">
                <Search size={18}/>
                <input type="search" value={ordersQuery} onChange={event => setOrdersQuery(event.target.value)}
                  placeholder="Search by customer, product or order number…" aria-label="Search orders as you type"/>
                {ordersQuery && <button type="button" aria-label="Clear order search" onClick={() => setOrdersQuery('')}><X size={16}/></button>}
              </div>
              {actionError && <div className="formerror" role="alert"><AlertCircle size={17}/>{actionError}</div>}
              <div className="panel tablewrap responsive-records orders-responsive-table">
                <table>
                  <thead><tr><th>Order</th><th>Customer</th><th>Item</th><th>Qty</th><th>Total</th><th>Received</th><th>Refunded</th><th>Payment / refund</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>{shownOrders.map(o => <tr key={o.id}>
                    <td><b>{o.id}</b><small>{o.date}</small></td>
                    <td>{o.customer}</td><td>{orderItems(o).map(line=><div key={line.productId}>{line.name} × {line.qty}</div>)}</td><td>{orderItems(o).reduce((sum,line)=>sum+line.qty,0)}</td>
                    <td>{money(orderTotal(o))}</td><td>{money(o.paid)}</td>
                    <td>{money(refundedAmount(o))}</td>
                    <td><span className={'refund-status ' + (refundDue(o) > 0 ? 'needs-refund' : '')}>{refundStatus(o)}</span>
                      {refundDue(o) > 0 && <small>{money(refundDue(o))} due</small>}
                      {(o.refundHistory || []).length > 0 && <details className="refund-history">
                        <summary>{o.refundHistory!.length} refund record(s)</summary>
                        {o.refundHistory!.map(r => <div key={r.id}><b>{money(r.amount)}</b> · {r.date} · {r.method}
                          {r.reference && <small>Ref: {r.reference}</small>}
                          {r.note && <small>{r.note}</small>}
                        </div>)}
                      </details>}
                    </td><td><span className="status">{o.status}</span></td>
                    <td><div className="action-buttons">
  {(o.status === 'Completed' || o.status === 'Fulfilled') && (
    <button type="button" className="icon-action" title="Preview / print invoice"
      aria-label={'Preview and print invoice '+o.id}
      onClick={() => setInvoiceOrder(o)}><Printer size={17}/></button>
  )}
  {o.status !== 'Cancelled' && (
    <button type="button" className="icon-action" title="Edit order"
      aria-label={'Edit order '+o.id} disabled={saving}
      onClick={() => editOrder(o)}><Pencil size={17}/></button>
  )}
  {!['Completed','Fulfilled','Cancelled'].includes(o.status) && (
    <button type="button" className="complete-action" title="Review payment and complete order"
      aria-label={'Review payment and complete order '+o.id} disabled={saving}
      onClick={() => openOrderAction('complete', o)}><CheckCircle2 size={17}/></button>
  )}
  {(o.status !== 'Cancelled' || refundDue(o) > 0.001) && (
    <button type="button" className="refund-action"
      title={o.status === 'Cancelled' ? 'Record refund' : 'Cancel order and review refund'}
      aria-label={'Cancel or refund order '+o.id} disabled={saving}
      onClick={() => openOrderAction(o.status === 'Cancelled' ? 'refund' : 'cancel', o)}><RotateCcw size={17}/></button>
  )}
  {o.paid <= 0 && refundedAmount(o) <= 0 && (
    <button type="button" className="delete-action" title="Delete order"
      aria-label={'Delete order '+o.id} disabled={saving}
      onClick={() => openOrderAction('delete', o)}><Trash2 size={17}/></button>
  )}
</div></td>
                  </tr>)}</tbody>
                </table>
                {!shownOrders.length && <p className="empty">No {orderTab.toLowerCase()} orders to display.</p>}
              </div>
            </>
          )}
          {page === 'Products' && (
            <>
              <div className="sectionhead">
                <div>
                  <h2>Your catalog</h2>
                  
                </div>
                <button className="primary" onClick={() => open('Product')}>
                  <Plus size={17} /> Add product
                </button>
              </div>
              <div className="catalog-filter-wrap">
                <Search size={18}/>
                <input type="search" aria-label="Filter product catalog" placeholder="Filter products by name or SKU…"
                  value={catalogQuery} onChange={event=>setCatalogQuery(event.target.value)}/>
                {catalogQuery&&<button type="button" aria-label="Clear catalog search" onClick={()=>setCatalogQuery('')}><X size={16}/></button>}
              </div>
              <div className="catalog-grid">
                {data.products.filter(p=>(p.name+' '+p.sku).toLowerCase().includes(catalogQuery.toLowerCase())).map(p=>(
                  <article className="catalog-card" key={p.id}>
                    <div className={'catalog-photo'+(productImages[p.id]?' has-photo':' no-photo')}>
                      {productImages[p.id] ? (
                        <img src={productImages[p.id]!} alt={p.name} loading="lazy"
                          onError={()=>setProductImages(images=>({...images,[p.id]:null}))}/>
                      ) : <div className="catalog-photo-empty" aria-label="No product image added">
                        <ImageIcon size={30} strokeWidth={1.35}/>
                      </div>}
                      <span className="catalog-sku">{p.sku}</span>
                    </div>
                    <div className="catalog-info">
                      <h3>{p.name}</h3>
                      <div className="catalog-price">{money(p.price)}</div>
                      <div className="catalog-details">
                        <div><span>Available stock</span><strong>{available(p)}</strong></div>
                        <div><span>Unit cost</span><strong>{money(p.cost)}</strong></div>
                      </div>
                      <div className="catalog-footer">
                        <span className={available(p)<=p.min?'catalog-stock low':'catalog-stock'}>
                          {available(p)<=p.min?'Low stock':'In stock'}                        </span>
                        <button type="button" className="catalog-edit" onClick={()=>editProduct(p)}
                          aria-label={'Edit product '+p.name} title={'Edit '+p.name}><Pencil size={18}/></button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              {!data.products.length && (
                <p className="empty">
                  Add your first product to start tracking stock.
                </p>
              )}
            </>
          )}
          {page === 'Customers' && (
            <>
              <div className="sectionhead">
                <div><h2>Customers</h2></div>
                <button className="primary" onClick={()=>open('Customer')}><Plus size={17}/> Add customer</button>              </div>
              <div className="panel tablewrap responsive-records customers-responsive-table">
                <table>
                  <thead><tr><th>Name / Company</th><th>Email</th><th>Phone</th><th>Location</th><th>Orders</th><th>Net received</th><th>Actions</th></tr></thead>
                  <tbody>{customers.map(c=><tr key={c.id}>
                    <td><b>{c.name}</b>{c.company&&<small>{c.company}</small>}</td>
                    <td>{c.email||'—'}</td><td>{c.phone||'—'}</td>
                    <td>{[c.city,c.country].filter(Boolean).join(', ')||'—'}</td>
                    <td>{c.orders}</td><td>{money(c.spent)}</td>
                    <td><button type="button" className="icon-action" aria-label={'Edit customer '+c.name} title="Edit customer"
                      onClick={()=>editCustomer(c)}><Pencil size={17}/></button></td>
                  </tr>)}</tbody>
                </table>
                {!customers.length&&<p className="empty">No customers yet. Click Add customer.</p>}
              </div>
            </>
          )}
          {page === 'Expenses' && (
            <>
              <div className="sectionhead">
                <div>
                  <h2>Business expenses</h2>

                </div>                <button className="primary" onClick={() => open('Expense')}>
                  <Plus size={17} /> Add expense
                </button>
              </div>              <div className="panel tablewrap responsive-records expenses-responsive-table">
                <table>
                  <thead>
                    <tr>
                      <th>Expense</th>
                      <th>Date</th>                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.expenses.map(e => (
                      <tr key={e.id}>
                        <td>
                          <b>{e.name}</b>                        </td>
                        <td>{e.date}</td>
                        <td>{money(e.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!data.expenses.length && (
                  <p className="empty">No expenses yet.</p>
                )}
              </div>
            </>
          )}
          {page === 'Content Planner' && (
            <>
              <div className="sectionhead">
                <div>
                  <h2>Content calendar</h2>
                  
                </div>
                <div className="section-actions">
                  <button type="button" className="secondary-action" onClick={()=>open('Note')}><NotebookPen size={17}/> Add note</button>
                  <button className="primary" onClick={() => open('Post')}><Plus size={17}/> Plan post</button>
                </div>
              </div>
              <div className="notes-section">
                <h3>My notes</h3>
                {(data.notes||[]).length>0 ? <div className="notes-grid">
                  {(data.notes||[]).map(note=><div className="note-card" key={note.id}>
                    <div className="note-card-heading"><b>{note.important&&<Star size={14} className="important-note-star"/>}{note.title}</b>
                      <button className="icon-action" type="button" aria-label={'Edit note '+note.title} onClick={()=>editNote(note)}><Pencil size={16}/></button>
                    </div>
                    <p>{note.body}</p><small>{note.date}</small>
                  </div>)}
                </div> : <p className="empty">No notes yet. Save ideas, reminders and campaign details here.</p>}              </div>
              <div className="panel tablewrap responsive-records posts-responsive-table">
                <table>
                  <thead>
                    <tr>
                      <th>Platform</th>
                      <th>Content idea</th>
                      <th>Post date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.posts.map(p => (
                      <tr key={p.id}>
                        <td>
                          <b>{p.platform}</b>
                        </td>
                        <td>{p.caption}</td>
                        <td>{p.date}</td>
                        <td>
                          <span className="status">{p.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!data.posts.length && (
                  <p className="empty">Plan your first post.</p>
                )}
              </div>
            </>
          )}
          {page === 'Pricing Lab' && (
            <>
              <div className="sectionhead">                <div>
                  <h2>Smart pricing assistant</h2>

                </div>
              </div>
              <div className="pricing">
                <div className="panel">
                  <h3>Your costs</h3>
                  <label className="field">
                    <span>Choose product</span>
                    <select
                      value={calcId}
                      onChange={e => setCalcId(e.target.value)}
                    >
                      {data.products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}                        </option>
                      ))}
                    </select>
                  </label>
                  {[
                    ['Packaging', pack, setPack],
                    ['Shipping', ship, setShip],
                    ['Desired contribution', desired, setDesired],
                    ['Percentage fee', fee, setFee],
                    ['Fixed fee', fixed, setFixed],
                  ].map(([name, v, fn]) => (
                    <label className="field" key={String(name)}>
                      <span>
                        {String(name)}{' '}
                        {name === 'Percentage fee' ? '(%)' : '(' + currencyCode + ')'}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        max={name==='Percentage fee'?99.99:1000000000}
                        value={v as number}
                        onChange={e =>
                          (fn as (n: number) => void)(
                            Math.min(name==='Percentage fee'?99.99:1000000000,Math.max(0,Number(e.target.value)||0))
                          )
                        }
                      />
                    </label>
                  ))}
                </div>
                <div className="priceoutput">
                  <div className="eyebrow">SUGGESTED MINIMUM SELLING PRICE</div>
                  <div className="huge">{pricingP&&Number.isFinite(recommended)&&fee<100?money(recommended):'—'}</div>
                  <p>
                    Based on your entered costs, estimated fees and target
                    contribution.
                  </p>
                  <div className="breakdown">
                    <div>
                      <span>Unit product cost</span>
                      <b>{money(pricingP?.cost || 0)}</b>
                    </div>
                    <div>
                      <span>Packaging + shipping</span>
                      <b>{money(pack + ship)}</b>
                    </div>
                    <div>
                      <span>Your target contribution</span>                      <b>{money(desired)}</b>
                    </div>
                    <div>
                      <span>Variable fee</span>
                      <b>{fee}%</b>
                    </div>
                  </div>
                  <small>
                    Not a market price recommendation. Taxes, refunds and
                    channel-specific charges may apply.
                  </small>
                </div>
              </div>
            </>
          )}
        </section>
      </main>
      {logoPreviewOpen && logoUrl && (
        <div className="modalback logo-preview-backdrop" role="presentation"
          onMouseDown={() => { if (!logoBusy) setLogoPreviewOpen(false); }}>
          <div className="logo-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="logo-preview-title"
            onMouseDown={event => event.stopPropagation()}>
            <div className="logo-preview-head">
              <div><h2 id="logo-preview-title">Business logo</h2>
                <p>{profile.businessName || 'Your business'}</p>
              </div>
              <button type="button" className="logo-preview-close" aria-label="Close logo preview"
                disabled={logoBusy} onClick={() => setLogoPreviewOpen(false)}><X size={20}/></button>
            </div>
            <div className="logo-preview-image">
              <img src={logoUrl} alt={(profile.businessName || 'Business') + ' logo - enlarged preview'}/>
            </div>
            <div className="logo-preview-footer">
              <span>View your saved logo or replace it with a new image.</span>
              <label className={'logo-preview-edit' + (logoBusy ? ' uploading' : '')}>
                <Pencil size={17}/> {logoBusy ? 'Uploading…' : 'Edit / Replace logo'}
                <input hidden type="file" accept="image/jpeg,image/png,image/webp"
                  disabled={logoBusy} onChange={uploadLogo}/>
              </label>
            </div>
          </div>
        </div>
      )}
      {orderAction && selectedActionOrder && (
        <div className="modalback" onMouseDown={() => { if (!saving) { setOrderAction(null); setActionError(''); } }}>
          <div className="modal order-action-dialog" role="dialog" aria-modal="true"
            aria-labelledby="order-action-title" onMouseDown={e => e.stopPropagation()}>
            <div className="modalhead">
              <div>
                <h2 id="order-action-title">{orderAction.kind === 'complete' ? 'Review payment & complete order' : orderAction.kind === 'delete' ? 'Delete this order?' : orderAction.kind === 'cancel' ? 'Cancel order & manage refund' : 'Record refund'}</h2>
                <p>{selectedActionOrder.id} · {selectedActionOrder.customer}</p>
              </div>
              <button type="button" className="close" aria-label="Close confirmation"
                disabled={saving} onClick={() => { setOrderAction(null); setActionError(''); }}><X size={21}/></button>            </div>
            <div className="action-payment-summary">
              <div><span>Order total</span><strong>{money(actionOrderTotal)}</strong></div>
              <div><span>Previously received</span><strong>{money(recordedPaid)}</strong></div>
              <div><span>{orderAction.kind === 'cancel' || orderAction.kind === 'refund' ? 'Previously refunded' : 'Balance currently due'}</span>
                <strong>{money(orderAction.kind === 'cancel' || orderAction.kind === 'refund' ? alreadyRefunded : Math.max(0, actionOrderTotal - recordedPaid))}</strong></div>
            </div>
            {orderAction.kind === 'complete' ? (
              <>
                <p className="action-caption"><b>Completing an order means the work is finished.</b> It does not automatically mean the customer has paid.</p>
                <label className="field">
                  <span>Additional payment received now ({currencyCode})</span>
                  <input type="number" min="0" step="0.01" inputMode="decimal"
                    value={additionalPayment} disabled={saving}
                    onChange={e => { setAdditionalPayment(e.target.value); setActionError(''); }}/>
                </label>
                <div className="action-payment-summary">
                  <div><span>Total received after this update</span><strong>{money(updatedPaid)}</strong></div>
                  <div className="action-balance"><span>Remaining unpaid</span><strong>{money(actionRemaining)}</strong></div>
                </div>
                {!validAdditionalPayment && <p className="action-warning" role="alert">
                  Enter an amount from {money(0)} to {money(Math.max(0, actionOrderTotal - recordedPaid))}.
                </p>}
                {validAdditionalPayment && actionRemaining > 0.001 && (
                  <label className="pending-acknowledgment">
                    <input type="checkbox" checked={acknowledgePending}
                      disabled={saving} onChange={e => setAcknowledgePending(e.target.checked)}/>
                    <span>I understand this order will be marked completed, but {money(actionRemaining)} will remain pending.</span>
                  </label>
                )}
                {validAdditionalPayment && actionRemaining <= 0.001 &&
                  <p className="action-paid"><CheckCircle2 size={16}/> Payment will be recorded as fully received.</p>}
              </>
            ) : orderAction.kind === 'cancel' || orderAction.kind === 'refund' ? (
              <div className="refund-form">
                <p className="action-caption">
                  <b>{orderAction.kind === 'cancel' ? 'Cancelled orders release reserved stock.' : 'Record a payment returned to the customer.'}</b>
                  {' '}Refunds are recorded here only after you actually send the money. No automatic transfer takes place.
                </p>
                <div className="action-payment-summary">
                  <div><span>Already refunded</span><strong>{money(alreadyRefunded)}</strong></div>
                  <div><span>Available to refund</span><strong>{money(refundable)}</strong></div>
                  <div className="action-balance"><span>Still to refund after this update</span>                    <strong>{validRefund ? money(Math.max(0,refundable-refundNow)) : 'Invalid amount'}</strong>
                  </div>
                </div>
                <label className="field">
                  <span>Amount actually refunded now ({currencyCode})</span>
                  <input type="number" min="0" step="0.01" max={refundable}
                    value={refundAmount} disabled={saving}
                    onChange={e => {setRefundAmount(e.target.value);setActionError('');}}/>
                </label>
                <button type="button" className="refund-full" disabled={saving || refundable <= 0}
                  onClick={() => setRefundAmount(String(refundable))}>Fill full remaining refund</button>
                {refundable > 0 && refundNow === 0 &&
                  <p className="refund-waiting">No refund will be marked sent. The amount stays Refund pending.</p>}
                {validRefund && refundNow > 0 && (
                  <>
                    <label className="field"><span>Refund method</span>
                      <select value={refundMethod} onChange={e => setRefundMethod(e.target.value)}>
                        {['Original payment method','Bank transfer','Cash','Other'].map(m => <option key={m}>{m}</option>)}                      </select>
                    </label>
                    <label className="field"><span>Refund sent date</span>
                      <input type="date" max={new Date().toISOString().slice(0,10)}
                        value={refundDate} onChange={e => setRefundDate(e.target.value)}/>
                    </label>
                    <label className="field"><span>Refund reference (optional)</span>
                      <input maxLength={100} value={refundReference} onChange={e => setRefundReference(e.target.value)}/>
                    </label>
                  </>
                )}
                <label className="field"><span>{orderAction.kind === 'cancel' ? 'Cancellation reason (optional)' : 'Refund note (optional)'}</span>
                  <input maxLength={200} value={refundNote} onChange={e => setRefundNote(e.target.value)}/>
                </label>
                <p className="refund-status-line">Refund status after saving: <b>{
                  recordedPaid <= 0 ? 'No refund required' :
                  validRefund && refundable-refundNow <= 0.001 ? 'Fully refunded' :
                  alreadyRefunded+(validRefund?refundNow:0)>0 ? 'Partially refunded' : 'Refund pending'
                }</b></p>
                {(selectedActionOrder.refundHistory || []).length > 0 &&
                  <div className="refund-history-dialog"><b>Previous refunds</b>
                    {selectedActionOrder.refundHistory!.map(r => <div key={r.id}>                      {money(r.amount)} · {r.date} · {r.method} {r.reference ? ' · '+r.reference : ''}
                    </div>)}
                  </div>}
              </div>
            ) : (
              <div className="delete-warning">
                <AlertCircle size={21}/>                <div>
                  <b>This permanently deletes the order from this workspace.</b>
                  {recordedPaid > 0 && <p>Deletion is blocked because this order has received a payment. Cancel the order and record refunds instead.</p>}
                  <p>Reports, customer totals, outstanding payments and allocated stock will be recalculated.
                    No refund is issued automatically, and this action cannot be undone. Keep a separate record if needed.</p>
                </div>
              </div>
            )}
            {actionError && <div role="alert" className="formerror"><AlertCircle size={17}/>{actionError}</div>}
            <div className="action-modal-buttons">
              <button type="button" className="action-cancel" disabled={saving}
                onClick={() => { setOrderAction(null); setActionError(''); }}>Cancel</button>
              <button type="button" className={orderAction.kind === 'delete' ? 'action-delete-confirm' : 'primary'}                disabled={saving ||
                  (orderAction.kind === 'complete' && (!validAdditionalPayment || (actionRemaining > 0.001 && !acknowledgePending))) ||
                  ((orderAction.kind === 'cancel' || orderAction.kind === 'refund') && (!validRefund || (refundNow > 0 && !refundDate))) ||
                  (orderAction.kind === 'delete' && (recordedPaid > 0 || alreadyRefunded > 0))}
                onClick={() => void confirmOrderAction()}>
                {orderAction.kind === 'delete' ? <Trash2 size={17}/> :
                  orderAction.kind === 'cancel' || orderAction.kind === 'refund' ? <RotateCcw size={17}/> : <CheckCircle2 size={17}/>}
                {saving ? 'Saving…' : orderAction.kind === 'delete' ? 'Delete order permanently' :
                  orderAction.kind === 'cancel' ? 'Cancel & save refund status' :
                  orderAction.kind === 'refund' ? 'Record refund' :
                  actionRemaining > 0.001 ? 'Complete with pending payment' : 'Confirm completed & paid'}
              </button>
            </div>
          </div>
        </div>
      )}
      {invoiceOrder && (
        <div className="modalback invoice-backdrop" onMouseDown={()=>setInvoiceOrder(null)}>
          <div className="invoice-dialog" role="dialog" aria-modal="true" aria-labelledby="invoice-preview-title"
            onMouseDown={e=>e.stopPropagation()}>
            <div className="invoice-toolbar">
              <h2 id="invoice-preview-title">A4 Invoice Preview</h2>
              <div>
                <button className="invoice-download-btn" type="button" disabled={invoiceDownloading}
                  onClick={()=>void downloadInvoice()}><Download size={18}/>{invoiceDownloading?'Generating PDF…':'Download PDF'}</button>
                <button className="primary" type="button" onClick={()=>window.print()}><Printer size={17}/> Print</button>
                <button className="close" type="button" aria-label="Close invoice" onClick={()=>setInvoiceOrder(null)}><X size={19}/></button>
              </div>
            </div>
            <div className="invoice-print-root" tabIndex={0} role="region" aria-label="Scrollable A4 invoice">
              <div className="invoice-classic-page">
                <svg className="invoice-classic-wave invoice-classic-wave-top" viewBox="0 0 1000 150" preserveAspectRatio="none" aria-hidden="true">
                  <defs><linearGradient id="invoice-blue-top" x1="0" x2="1"><stop offset="0%" stopColor="#0e214b"/><stop offset="48%" stopColor="#1660ac"/><stop offset="100%" stopColor="#0e214b"/></linearGradient></defs>
                  <path d="M0 0 H1000 V70 C720 118 567 77 429 54 C234 17 120 31 0 144 Z" fill="url(#invoice-blue-top)"/>
                </svg>                <div className="invoice-classic-body">
                  <div className="invoice-classic-heading">
                    <div><h1>INVOICE</h1><p>Invoice Number: {invoiceOrder.id}</p><p>Date: {invoiceOrder.date}</p></div>
                    <div className="invoice-classic-brand">
                      <strong>{profile.businessName || 'My Business'}</strong>
                      {logoUrl ? <img src={logoUrl} alt="Business logo"/> : <span className="invoice-classic-geometric-mark" aria-hidden="true"/>}
                    </div>
                  </div>
                  <div className="invoice-classic-info">
                    <div>
                      <h3>BILL TO:</h3>
                      <strong>{invoiceOrder.customer}</strong>
                      {(()=>{
                        const c=(data.customers||[]).find(c=>c.name.toLowerCase()===invoiceOrder.customer.toLowerCase());
                        return c?<div className="invoice-classic-contact">
                          {c.company&&<div>{c.company}</div>}
                          {c.address&&<div>{c.address}</div>}
                          {(c.city||c.country)&&<div>{[c.city,c.country].filter(Boolean).join(', ')}</div>}
                          {c.email&&<div>{c.email}</div>}
                          {c.phone&&<div>{c.phone}</div>}
                        </div>:null;
                      })()}
                    </div>
                    <div>
                      <h3>PAYMENT INFORMATION:</h3>
                      <div><b>Order:</b> {invoiceOrder.id}</div>
                      <div><b>Status:</b> {invoiceOrder.status}</div>
                      <div><b>Currency:</b> {currencyCode}</div>
                      <div><b>Received:</b> {money(invoiceOrder.paid)}</div>
                    </div>
                  </div>
                  <table className="invoice-classic-table">
                    <thead><tr><th>ITEM</th><th>DESCRIPTION</th><th>RATE</th><th>AMOUNT</th></tr></thead>
                    <tbody>{orderItems(invoiceOrder).map((line,i)=><tr key={line.productId+'-'+i}>
                      <td>{i+1}.</td>
                      <td>{line.name}<small>{line.sku&&line.sku+' · '}Qty: {line.qty}</small></td>
                      <td>{money(line.unitPrice)}</td>
                      <td>{money(line.unitPrice*line.qty)}</td>
                    </tr>)}</tbody>
                  </table>
                  <div className="invoice-classic-bottom">
                    <div className="invoice-classic-terms">
                      <h3>TERM AND CONDITIONS:</h3>
                      <p>Thank you for your business. Any balance due is payable according to the payment terms agreed with the customer.</p>
                    </div>
                    <div className="invoice-classic-totals">
                      <div className="invoice-classic-summary">
                        <div><span>Sub Total:</span><strong>{money(orderItems(invoiceOrder).reduce((s,l)=>s+l.qty*l.unitPrice,0))}</strong></div>
                        <div><span>Discount:</span><strong>−{money(invoiceOrder.discount||0)}</strong></div>
                        <div><span>Shipping:</span><strong>{money(invoiceOrder.shipping||0)}</strong></div>
                        <div><span>Sales Tax:</span><strong>{money(invoiceOrder.tax||0)}</strong></div>
                      </div>
                      <div className="invoice-classic-total"><span>TOTAL:</span><strong>{money(orderTotal(invoiceOrder))}</strong></div>
                      <div className="invoice-classic-payment"><span>Received:</span><strong>{money(invoiceOrder.paid)}</strong></div>
                      <div className="invoice-classic-payment"><span>Balance Due:</span><strong>{money(Math.max(0,orderTotal(invoiceOrder)-invoiceOrder.paid))}</strong></div>
                    </div>
                  </div>
                </div>
                <svg className="invoice-classic-wave invoice-classic-wave-bottom" viewBox="0 0 1000 145" preserveAspectRatio="none" aria-hidden="true">
                  <defs><linearGradient id="invoice-blue-bottom" x1="0" x2="1"><stop offset="0%" stopColor="#102250"/><stop offset="51%" stopColor="#165faa"/><stop offset="100%" stopColor="#102250"/></linearGradient></defs>
                  <path d="M0 55 C208 12 409 100 614 109 C793 124 889 65 1000 0 V145 H0 Z" fill="url(#invoice-blue-bottom)"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}
      {currencyModal && (
        <div className="modalback" onMouseDown={() => { if(!currencyBusy) setCurrencyModal(false); }}>
          <div className="modal currency-modal" role="dialog" aria-modal="true" aria-labelledby="currency-title"
            onMouseDown={event => event.stopPropagation()}>
            <div className="modalhead">
              <div><h2 id="currency-title">Change Currency</h2>
                <p>Use an exchange rate to convert your existing business amounts.</p></div>
              <button type="button" className="close" disabled={currencyBusy}
                onClick={() => setCurrencyModal(false)}><X size={19}/></button>
            </div>
            <label className="field"><span>Current currency</span><input value={currencyCode} readOnly/></label>
            <label className="field"><span>New currency</span>
              <select value={currencyTarget} disabled={currencyBusy} onChange={event => void previewCurrency(event.target.value)}>
                {['USD','GBP','EUR','PKR','CAD','AUD'].map(code => <option key={code}>{code}</option>)}
              </select>
            </label>
            {currencyTarget !== currencyCode && !fxQuote && !currencyError &&
              <p className="currency-feedback">Checking current reference rate…</p>}
            {fxQuote && <div className="currency-quote">
              <b>1 {fxQuote.from} = {fxQuote.rate.toLocaleString('en-US',{maximumFractionDigits:6})} {fxQuote.to}</b>
              <small>Rate date: {fxQuote.date} · {fxQuote.source}</small>
              <p>Example: {new Intl.NumberFormat('en-US',{style:'currency',currency:fxQuote.from}).format(100)} →
                {' '}{new Intl.NumberFormat('en-US',{style:'currency',currency:fxQuote.to}).format(100*fxQuote.rate)}</p>
            </div>}
            <p className="currency-risk"><AlertCircle size={17}/> Converting will update saved prices, costs, payments,
              order totals, refunds and expenses. Stock quantities do not change. Values may be rounded to two decimals.
              Reference exchange rates may differ from bank rates.</p>
            {currencyError && <p className="formerror" role="alert">{currencyError}</p>}
            <div className="currency-actions">
              <button type="button" className="action-cancel" disabled={currencyBusy} onClick={() => setCurrencyModal(false)}>Cancel</button>
              <button type="button" className="primary" disabled={currencyBusy || !fxQuote || currencyTarget === currencyCode}
                onClick={() => void applyCurrencyConversion()}>{currencyBusy ? 'Converting…' : 'Convert all amounts'}</button>
            </div>
          </div>
        </div>
      )}
      {passwordHelp && <div className="modalback" onMouseDown={() => setPasswordHelp(false)}>
        <div className="modal account-help" role="dialog" aria-modal="true" aria-labelledby="password-title"
          onMouseDown={event => event.stopPropagation()}>
          <div className="modalhead"><h2 id="password-title">Change Password</h2>
            <button className="close" type="button" aria-label="Close" onClick={() => setPasswordHelp(false)}><X size={20}/></button>
          </div>
          <p>Command Center uses Google, Apple, X or passwordless email sign-in. It does not store its own password.</p>
          <p>Select the provider you use to open its official account-security page:</p>
          <div className="password-provider-links">
            <a href="https://myaccount.google.com/intro/signinoptions/password" target="_blank" rel="noopener noreferrer">
              Google — change password <ExternalLink size={15}/>
            </a>
            <a href="https://account.apple.com/" target="_blank" rel="noopener noreferrer">              Apple — account security <ExternalLink size={15}/>
            </a>
            <a href="https://help.x.com/en/managing-your-account/forgotten-or-lost-password-reset" target="_blank" rel="noopener noreferrer">
              X — password help <ExternalLink size={15}/>
            </a>
          </div>
          <p className="passwordless-note"><b>Email-link sign-in:</b> No password is used. Each sign-in is verified with a link sent to your email.</p>
          <button type="button" className="primary" onClick={() => setPasswordHelp(false)}>Close</button>
        </div>
      </div>}
      {modal && (
        <div className="modalback" onMouseDown={() => setModal('')}>          <div className="modal" onMouseDown={e => e.stopPropagation()}>
            <div className="modalhead">
              <div>
                <h2>{editingId ? 'Edit ' : 'Add '}{modal.toLowerCase()}</h2>
                
              </div>
              <button className="close" onClick={() => setModal('')}>
                <X size={21} />
              </button>
            </div>
            <form onSubmit={submit}>
              {modal === 'Product' && (
                <>
                  <div className="product-photo-form">
                    <div className={'product-photo-preview'+(productPhotoDraft||(!productPhotoRemove&&editingId&&productImages[editingId])?' contains-image':'')}>
                      {productPhotoDraft || (!productPhotoRemove&&editingId&&productImages[editingId]) ? (
                        <img src={productPhotoDraft||productImages[editingId!]!} alt="Product preview"/>
                      ) : <div className="product-photo-placeholder"><ImageIcon size={30} strokeWidth={1.4}/>
                        <small>Product image (optional)</small></div>}
                    </div>
                    <div className="product-photo-controls">
                      <strong>Product photo</strong>
                      <p>JPG, PNG or WebP · Max 8 MB</p>
                      <label className="product-photo-upload">
                        <ImagePlus size={17}/>{productPhotoBusy?'Preparing image…':productPhotoDraft||(!productPhotoRemove&&editingId&&productImages[editingId])?'Replace image':'Add image'}
                        <input hidden type="file" accept="image/jpeg,image/png,image/webp"
                          onChange={prepareProductPhoto} disabled={saving||productPhotoBusy}/>
                      </label>
                      {(productPhotoDraft||(!productPhotoRemove&&editingId&&productImages[editingId]))&&
                        <button type="button" className="product-photo-remove"
                          disabled={saving||productPhotoBusy}
                          onClick={()=>{setProductPhotoDraft(null);setProductPhotoRemove(true);}}>
                          <Trash2 size={15}/> Remove image
                        </button>}
                    </div>
                  </div>
                  <Field form={form} change={change} name="name" label="Product name" />
                  <Field form={form} change={change} name="sku" label="SKU (unique code)" />
                  <div className="formgrid">
                    <Field form={form} change={change}
                      name="price"
                      label={`Selling price (${currencyCode})`}
                      type="number"
                    />
                    <Field form={form} change={change} name="cost" label={`Unit cost (${currencyCode})`} type="number" />
                    <Field form={form} change={change} name="stock" label="Starting stock" type="number" />
                    <Field form={form} change={change} name="min" label="Restock threshold" type="number" />
                  </div>
                </>
              )}
              {modal === 'Order' && (
                <>
                  <div className="customer-suggestions-wrap">
                    <Field form={form} change={change} name="customer" label="Customer name"/>
                    {customerMatches.length>0&&<div className="customer-suggestions" role="listbox">
                      {customerMatches.map(name=><button type="button" key={name} onClick={()=>change('customer',name)}>{name}</button>)}
                    </div>}
                  </div>
                  <div className="product-lookup" ref={pickerRef}>
                    <label className="field">
                      <span>Add products (search by name or SKU)</span>
                      <input type="search" autoComplete="off" value={productQuery}
                        placeholder="Type to find products and add them…" onFocus={()=>setProductSearchOpen(true)}
                        onChange={event=>{setProductQuery(event.target.value);setProductSearchOpen(true);}}
                        aria-label="Search products"/>
                    </label>
                    {productSearchOpen&&<div className="product-results" role="listbox" aria-label="Matching products">
                      {productMatches.length ? productMatches.map(p=><button type="button" key={p.id}
                        onClick={()=>addDraftProduct(p)}>
                        <span><b>{p.name}</b><small>{p.sku} · {available(p)} available</small></span>
                        <strong>{money(p.price)} <Plus size={14}/></strong>                      </button>):<p>No matching products.</p>}
                    </div>}
                  </div>
                  <div className="order-line-list">
                    <div className="order-lines-title"><b>Products in this order</b><small>{draftItems.length} unique item(s)</small></div>
                    {draftItems.length===0&&<p className="empty">Search and select products above. You can add several products to one order.</p>}
                    {draftItems.map(line=><div className="order-line-row" key={line.productId}>
                      <div className="order-line-description"><b>{line.name}</b><small>{line.sku} · {money(line.unitPrice)} each</small></div>
                      <label className="line-qty"><span>Qty</span><input type="number" min="1" step="1"
                        value={line.qty}
                        onChange={event=>setDraftItems(lines=>lines.map(item=>item.productId===line.productId?
                          {...item,qty:Number(event.target.value)}:item))}/></label>
                      <strong>{money(line.qty*line.unitPrice)}</strong>
                      <button className="icon-action" type="button" aria-label={'Remove '+line.name} title="Remove item"
                        onClick={()=>setDraftItems(items=>items.filter(item=>item.productId!==line.productId))}><X size={17}/></button>
                    </div>)}
                  </div>
                  <div className="formgrid">
                    <Field form={form} change={change} name="shipping" label={`Shipping charged (${currencyCode})`} type="number"/>
                    <Field form={form} change={change} name="discount" label="Discount (%)" type="number"/>                    <Field form={form} change={change} name="tax" label={`Tax charged (${currencyCode})`} type="number"/>
                  </div>
                  <div className="order-summary" aria-live="polite">
                    <h3>Order summary</h3>
                    <div><span>Products subtotal</span><b>{money(draftSubtotal)}</b></div>
                    <div><span>Shipping</span><b>{money(draftShipping)}</b></div>
                    <div><span>Tax</span><b>{money(draftTax)}</b></div>
                    <div><span>Discount ({draftDiscountPercent}%)</span><b>−{money(draftDiscount)}</b></div>
                    <div className="order-total"><span>Total customer owes</span><b>{money(draftTotal)}</b></div>
                  </div>
                  <Field form={form} change={change} name="paid" label={`Payment received (${currencyCode})`} type="number"/>
                  <div className="remaining">Remaining to collect: <strong>{money(Math.max(0,draftTotal-draftPaid))}</strong></div>
                  <Field form={form} change={change} name="scheduledDate" label="Scheduled / delivery date (optional)" type="date"/>
                  <Field form={form} change={change} name="status" label="Order status"
                    options={(editingId?['New','Planned','Processing','Completed','Cancelled']:['New','Planned','Processing','Completed'])
                      .map(value=>({value,label:value}))}/>
                  {editingId&&<p className="order-cancel-hint">Selecting Cancelled opens refund confirmation. Other unsaved changes won't apply.</p>}
                </>
              )}
              {modal === 'Customer' && (
                <>
                  <Field form={form} change={change} name="name" label="Full customer name *"/>
                  <div className="formgrid">
                    <Field form={form} change={change} name="email" label="Email address" type="email"/>
                    <Field form={form} change={change} name="phone" label="Phone / WhatsApp"/>
                    <Field form={form} change={change} name="company" label="Company / shop"/>
                    <Field form={form} change={change} name="city" label="City"/>
                    <Field form={form} change={change} name="country" label="Country"/>
                    <Field form={form} change={change} name="address" label="Street address"/>
                  </div>
                  <label className="field"><span>Internal notes</span><textarea rows={3} value={form.notes||''}
                    onChange={e=>change('notes',e.target.value)} placeholder="Delivery notes, preferences, etc."/></label>
                </>
              )}              {modal === 'Note' && (
                <>
                  <Field form={form} change={change} name="title" label="Note title"/>
                  <label className="field"><span>Details *</span>
                    <textarea rows={5} value={form.body||''} onChange={e=>change('body',e.target.value)}
                      placeholder="Write your ideas, tasks or reminders here…"/></label>
                  <Field form={form} change={change} name="date" label="Reminder / note date" type="date"/>
                  <label className="important-note-label">
                    <input type="checkbox" checked={form.important==='true'}
                      onChange={event=>change('important',event.target.checked?'true':'false')}/>
                    <Star size={17}/> Mark as important — show on Dashboard
                  </label>
                </>
              )}
              {modal === 'Expense' && (
                <>
                  <Field form={form} change={change} name="name" label="Expense description" />
                  <Field form={form} change={change} name="amount" label={`Amount (${currencyCode})`} type="number" />
                  <Field form={form} change={change} name="date" label="Date" type="date" />
                </>
              )}
              {modal === 'Post' && (
                <>
                  <Field form={form} change={change}
                    name="platform"                    label="Platform"
                    options={[
                      'Instagram',
                      'Pinterest',
                      'TikTok',
                      'Facebook',
                    ].map(v => ({ value: v, label: v }))}
                  />
                  <Field form={form} change={change} name="caption" label="Content idea or caption" />
                  <Field form={form} change={change} name="date" label="Scheduled date" type="date" />
                  <Field form={form} change={change}
                    name="status"
                    label="Status"
                    options={['Draft', 'Planned', 'Posted'].map(v => ({
                      value: v,
                      label: v,
                    }))}
                  />
                </>
              )}
              {error && (
                <div className="formerror" role="alert" aria-live="assertive">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}
              <button type="submit" className="primary full" disabled={saving||productPhotoBusy}>
                <CheckCircle2 size={17} /> {saving ? 'Saving…' : editingId ? 'Save changes' : 'Save ' + modal.toLowerCase()}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default App;
