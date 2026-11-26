// Unit tests for the pure logic behind F1/F4/F5/F7/F9. They run with plain `node --test` (no browser, no React).
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');

const cache={};
function load(name){
  if(cache[name])return cache[name];
  const file=path.join(__dirname,'..','src','lib',name+'.ts');
  const exports={};
  const context={exports,require:id=>{ if(id.startsWith('./'))return load(id.slice(2)); throw new Error('unexpected import '+id); }};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,context);
  return cache[name]=exports;
}
const pricing=load('pricing'), records=load('records'), validation=load('validation'), dialog=load('dialog');
// Objects created inside vm contexts have a different Object.prototype, so compare structurally via JSON.
const same=(a,b)=>assert.equal(JSON.stringify(a),JSON.stringify(b));
const base={pack:'2',ship:'3',desired:'10',fee:'6.5',fixed:'0.3'};

// ---------------- F5 pricing ----------------
test('pricing keeps the original formula (cost+pack+ship+desired+fixed)/(1-fee), rounded up to a cent',()=>{
  const r=pricing.calculatePricing(base,12,null);
  const expected=Math.ceil(((12+2+3+10+0.3)/(1-0.065))*100)/100;
  assert.equal(r.valid,true); assert.equal(r.price,expected);
});
test('pricing never silently clamps: negative and >99.99% fee are validation errors',()=>{
  let r=pricing.calculatePricing({...base,fee:'100'},12);
  assert.equal(r.valid,false); assert.match(r.errors.fee,/below 100%/); assert.equal(r.price,null);
  r=pricing.calculatePricing({...base,ship:'-1'},12);
  assert.match(r.errors.ship,/cannot be negative/);
  r=pricing.calculatePricing({...base,pack:'abc'},12);
  assert.match(r.errors.pack,/must be a number/);
  r=pricing.calculatePricing({...base,desired:''},12);
  assert.match(r.errors.desired,/must be a number/);
});
test('pricing never produces NaN or Infinity',()=>{
  for(const fee of ['99.99','0','50','1e3','Infinity','NaN','-0']){
    const r=pricing.calculatePricing({...base,fee},12);
    for(const v of [r.price,r.feeAmount,r.contribution,r.marginPct,r.markupPct]) if(v!==null) assert.ok(Number.isFinite(v),fee+' -> '+v);
  }
  const r=pricing.calculatePricing({pack:'0',ship:'0',desired:'0',fee:'0',fixed:'0'},0);
  assert.equal(r.price,0); assert.equal(r.markupPct,null); assert.ok(r.warnings.some(w=>/zero/.test(w)));
});
test('pricing rounds up with cent precision and ignores binary float noise',()=>{
  assert.equal(pricing.ceilCents(10.000000000000002),10);
  assert.equal(pricing.ceilCents(10.001),10.01);
  assert.equal(pricing.calculatePricing({pack:'0',ship:'0',desired:'0.1',fee:'0',fixed:'0.2'},0).price,0.3);
});
test('pricing warns about an unrealistic fee and about costs above the current selling price',()=>{
  let r=pricing.calculatePricing({...base,fee:'45'},12,40);
  assert.ok(r.warnings.some(w=>/unusually high/.test(w)));
  r=pricing.calculatePricing(base,30,10);
  assert.ok(r.warnings.some(w=>/at or above/.test(w)));
  r=pricing.calculatePricing(base,12,20);
  assert.ok(r.warnings.some(w=>/below the suggested minimum/.test(w)));
  assert.equal(pricing.calculatePricing(base,null).valid,false);
});
test('pricing reports margin and markup separately',()=>{
  const r=pricing.calculatePricing(base,12,null);
  assert.ok(Math.abs(r.marginPct-r.contribution/r.price*100)<1e-9);
  assert.ok(Math.abs(r.markupPct-r.contribution/r.baseCost*100)<1e-9);
  assert.ok(r.markupPct>r.marginPct);
  assert.ok(r.contribution>=10-0.01,'contribution covers the requested target after fees');
});
test('currency scaling multiplies money inputs only (fee % unchanged) and ignores bad rates',()=>{
  const s=pricing.scalePricingInputs(base,2);
  same({...s},{pack:'4',ship:'6',desired:'20',fee:'6.5',fixed:'0.6'});
  same({...pricing.scalePricingInputs(base,0)},base);
  same({...pricing.scalePricingInputs({...base,pack:'x'},2)}.pack,'x');
});

// ---------------- F9 records ----------------
test('archive is reversible and never removes the record',()=>{
  const products=[{id:'a',name:'A',sku:'S1'},{id:'b',name:'B',sku:'S2'}];
  const archived=records.setArchived(products,'a',true);
  assert.equal(archived.length,2); assert.equal(archived[0].archived,true);
  assert.equal(products[0].archived,undefined,'input is not mutated');
  same(records.activeOnly(archived).map(p=>p.id),['b']);
  same(records.archivedOnly(archived).map(p=>p.id),['a']);
  const restored=records.setArchived(archived,'a',false);
  assert.equal('archived' in restored[0],false); same(restored,products);
});
test('archiving a customer that only exists through orders materialises a stored record',()=>{
  const auto={id:'auto-jane doe',name:'Jane Doe',email:'',phone:'',company:'',address:'',city:'',country:'',notes:''};
  const out=records.setCustomerArchived([],auto,true);
  assert.equal(out.length,1); assert.equal(out[0].archived,true); assert.equal(out[0].name,'Jane Doe'); assert.ok(!out[0].id.startsWith('auto-'));
  const back=records.setCustomerArchived(out,out[0],false);
  assert.equal(back[0].archived,undefined);
});
test('archived customers are not offered for new orders but past order names still resolve',()=>{
  const stored=[{id:'c1',name:'Old Client',archived:true},{id:'c2',name:'Active Client'}];
  const orders=[{id:'o1',customer:'Old Client',productId:'p',items:[]},{id:'o2',customer:'Walk In',productId:'p'}];
  const names=records.selectableCustomerNames(stored,orders);
  same(names.sort(),['Active Client','Walk In']);
  assert.equal(records.customerHasHistory('old client',orders),true);
});
test('product history detection supports multi-item and legacy single-product orders',()=>{
  const orders=[{id:'1',customer:'x',productId:'legacy'},{id:'2',customer:'y',productId:'a',items:[{productId:'b'},{productId:'c'}]}];
  assert.equal(records.productHasHistory('legacy',orders),true);
  assert.equal(records.productHasHistory('c',orders),true);
  assert.equal(records.productHasHistory('zzz',orders),false);
});
test('expense categories: fixed list, legacy records without a category stay valid',()=>{
  same([...records.EXPENSE_CATEGORIES],['Supplies','Shipping','Marketing','Software','Rent','Utilities','Other']);
  assert.equal(records.normalizeCategory(undefined),''); assert.equal(records.normalizeCategory('Hacking'),''); assert.equal(records.normalizeCategory('Rent'),'Rent');
  assert.equal(records.expenseCategoryLabel(undefined),'Uncategorised');
  same(records.expenseTotalsByCategory([{amount:1.1,category:'Rent'},{amount:2.2,category:'Rent'},{amount:5}]),{Rent:3.3,Uncategorised:5});
});
test('plural helper and greeting fallback',()=>{
  assert.equal(records.plural(1,'order'),'1 order'); assert.equal(records.plural(0,'order'),'0 orders'); assert.equal(records.plural(2,'refund record'),'2 refund records'); assert.equal(records.plural(2,'person','people'),'2 people');
  assert.equal(records.greetingName('  Sam ','Ignored','a@b.c'),'Sam');
  assert.equal(records.greetingName('','Alex Chen','a@b.c'),'Alex Chen');
  assert.equal(records.greetingName('','a@b.c','a@b.c'),'there');
  assert.equal(records.greetingName('','someone@host.dev','other@x.y'),'there');
  assert.equal(records.greetingName(undefined,undefined,undefined),'there');
});

// ---------------- F4 validation ----------------
test('product validation returns field-level messages incl. duplicate SKU and allocated stock',()=>{
  const ok={name:'Mug',sku:'MUG-1',price:'10.50',cost:'4',stock:'10',min:'2'};
  same({...validation.validateProductForm(ok,{})},{});
  const dup=validation.validateProductForm(ok,{skuTaken:true});
  assert.match(dup.sku,/already uses this SKU/);
  const bad=validation.validateProductForm({name:'',sku:'',price:'-1',cost:'1.234',stock:'1.5',min:''},{});
  same(Object.keys(bad).sort(),['cost','min','name','price','sku','stock']);
  assert.match(validation.validateProductForm({...ok,stock:'3'},{allocated:5}).stock,/allocated/);
});
test('customer / expense / post / note / order validation',()=>{
  assert.match(validation.validateCustomerForm({name:'A',email:'nope'},{}).email,/valid email/);
  assert.match(validation.validateCustomerForm({name:'A',phone:'12'},{}).phone,/valid phone/);
  assert.match(validation.validateCustomerForm({name:'A'},{nameTaken:true}).name,/already exists/);
  same({...validation.validateCustomerForm({name:'A',email:'a@b.co',phone:'+1 (555) 123-4567'},{})},{});
  assert.match(validation.validateExpenseForm({name:'x',amount:'0'}).amount,/above 0/);
  assert.match(validation.validateExpenseForm({name:'x',amount:'5',category:'Gambling'}).category,/Choose a category/);
  same({...validation.validateExpenseForm({name:'x',amount:'5.25',date:'2026-02-28',category:'Rent'})},{});
  assert.match(validation.validateExpenseForm({name:'x',amount:'5',date:'2026-02-30'}).date,/valid date/);
  assert.match(validation.validatePostForm({platform:'MySpace',caption:'',date:''}).platform,/platform/);
  same({...validation.validatePostForm({platform:'TikTok',caption:'c',date:'2026-01-01',status:'Draft'})},{});
  assert.match(validation.validateNoteForm({title:'',body:''}).title,/title/);
  const o=validation.validateOrderForm({customer:'',paid:'',status:'Planned'},{lineCount:0});
  assert.ok(o.customer&&o.products&&o.paid&&o.scheduledDate);
  assert.match(validation.validateOrderForm({customer:'X',paid:'0'},{lineCount:1,customerArchived:true}).customer,/archived/);
});

// ---------------- F1 focus trap ----------------
test('focus trap wraps in both directions and pulls stray focus back in',()=>{
  const list=['a','b','c'];
  assert.equal(dialog.nextTrappedFocus(list,'c',false),'a');
  assert.equal(dialog.nextTrappedFocus(list,'a',true),'c');
  assert.equal(dialog.nextTrappedFocus(list,'b',false),null);
  assert.equal(dialog.nextTrappedFocus(list,'outside',false),'a');
  assert.equal(dialog.nextTrappedFocus(list,null,true),'c');
  assert.equal(dialog.nextTrappedFocus([],'a',false),null);
});

// ---------------- R-01 focus restoration ----------------
test('R-01: focus restore waits for a disabled opener, then falls back safely',()=>{
  const d=(o)=>dialog.decideRestore({triggerConnected:true,triggerDisabled:false,fallbackAvailable:true,attempt:0,maxAttempts:30,...o});
  assert.equal(d({}),'focus-trigger');
  assert.equal(d({triggerDisabled:true,attempt:3}),'wait');                       // save/archive still in flight
  assert.equal(d({triggerDisabled:true,attempt:30}),'focus-fallback');            // never became enabled
  assert.equal(d({triggerDisabled:true,attempt:30,fallbackAvailable:false}),'focus-main');
  assert.equal(d({triggerConnected:false}),'focus-fallback');                     // opener unmounted (record moved to Archived)
  assert.equal(d({triggerConnected:false,fallbackAvailable:false}),'focus-main'); // nothing else: main landmark, never BODY
});
test('R-01: user-placed focus is never stolen',()=>{
  assert.equal(dialog.focusAlreadyPlaced({tagName:'BODY'},true),false);
  assert.equal(dialog.focusAlreadyPlaced(null,true),false);
  assert.equal(dialog.focusAlreadyPlaced({tagName:'BUTTON'},true),true);
  assert.equal(dialog.focusAlreadyPlaced({tagName:'BUTTON'},false),false);
});
// ---------------- R-02 license email ----------------
test('R-02: license buyer email validation messages',()=>{
  assert.match(validation.validateLicenseEmail(''),/Enter the buyer/);
  assert.match(validation.validateLicenseEmail('   '),/Enter the buyer/);
  for(const bad of ['buyer','buyer@','@x.com','a b@x.com','a@b','a@@b.com','a@b.c']) assert.match(validation.validateLicenseEmail(bad),/valid email/,bad);
  assert.match(validation.validateLicenseEmail('a'.repeat(250)+'@x.com'),/too long/);
  for(const ok of ['buyer@example.com',' Buyer+tag@Sub.Example.co.uk ']) assert.equal(validation.validateLicenseEmail(ok),'');
});
// ---------------- R-03 grammar: zero / one / many orders ----------------
test('R-03: order counts read correctly for 0, 1 and many',()=>{
  assert.equal(records.plural(0,'order'),'0 orders');
  assert.equal(records.plural(1,'order'),'1 order');
  assert.equal(records.plural(2,'order'),'2 orders');
  assert.equal(records.plural(1,'planned order'),'1 planned order');
  assert.equal(records.plural(12,'planned order'),'12 planned orders');
});
