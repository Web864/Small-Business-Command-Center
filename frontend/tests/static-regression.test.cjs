// Source-level regression guards (NOT browser tests). They fail if a fixed defect is re-introduced.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'..','src','App.tsx'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'..','src','index.css'),'utf8');
const dlg=fs.readFileSync(path.join(__dirname,'..','src','components','Dialog.tsx'),'utf8');

test('F1: every modal goes through the shared accessible Dialog component',()=>{
  assert.equal((app.match(/<div className="modalback/g)||[]).length,0,'no hand-rolled backdrops remain');
  assert.ok((app.match(/<Dialog /g)||[]).length>=6);
  for(const needle of ['role={role}','aria-modal="true"','aria-labelledby={titleId}','inert','Escape','nextTrappedFocus','scheduleRestore','target.focus']) assert.ok(dlg.includes(needle),needle);
  assert.ok(/backdropDismiss=\{false\}/.test(app),'destructive/form dialogs ignore backdrop clicks');
  assert.ok(app.includes('Discard unsaved changes?'));
  assert.ok(app.includes('aria-label={\'Close \' + modal.toLowerCase() + \' form\'}'));
});
test('F2: skip link, nav landmark, aria-current, main target, live region, titles',()=>{
  for(const needle of ['className="skip-link"','href="#main-content"','<nav aria-labelledby','aria-current={page === name','id="main-content"','role="status" aria-live="polite"','document.title']) assert.ok(app.includes(needle),needle);
  assert.ok(!app.includes('window.confirm'),'no native confirm()'); assert.ok(!app.includes('window.alert'),'no native alert()');
});
test('F4: Field supports required / error / aria wiring',()=>{
  for(const needle of ["'aria-invalid'","'aria-describedby'","required-mark","field-error"]) assert.ok(app.includes(needle),needle);
  assert.ok(app.includes('noValidate'));
});
test('F5: pricing inputs are validated strings, not silently clamped',()=>{
  assert.ok(!/Math\.min\(name==='Percentage fee'/.test(app)); assert.ok(app.includes('calculatePricing('));
});
test('F6: invoice has no placeholder business name, LOGO box or blue/yellow branding',()=>{
  assert.ok(!app.includes("'My Business'")); assert.ok(!app.includes('[247,191,53]')); assert.ok(!app.includes('[17,47,99]'));
  assert.ok(!/#112f63|#1660ac|#165faa|#0e214b/.test(app+css));
});
test('F7: microcopy and defaults',()=>{
  assert.ok(app.includes('<h2>Content plan</h2>')); assert.ok(!app.includes('Content calendar'));
  assert.ok(app.includes("'Starting stock'")&&app.includes("'Stock quantity'"));
  assert.ok(app.includes("localStorage.getItem('sbcc_hidden_metrics')"));
  assert.ok(app.includes('hiddenMetrics[title] ? <span className="stat-hidden-line"'),'metrics show values unless the user hid them');
  assert.ok(!/\(s\)/.test(app.replace(/\(s\)/g,m=>m).match(/\w\(s\)/g)?.join('')||''),'no "(s)" pluralisation');
});
test('F8: 44px touch-target rule exists for coarse pointers and tablets',()=>{
  assert.ok(/@media \(pointer:coarse\), \(max-width:1024px\)/.test(css)); assert.ok(css.includes('min-height:44px;min-width:44px'));
});
test('F9: archive/delete flows persist through save() (no frontend-only state)',()=>{
  for(const fn of ['archiveProduct','archiveCustomer','deleteExpense','deletePost','deleteNote']) assert.ok(app.includes('const '+fn+' ='),fn);
  assert.ok(/runRecordAction = async[\s\S]*await save\(next\)/.test(app));
});

test('R-02: license email field is labelled, validated and announces errors',()=>{
  for(const needle of ['id="license-buyer-email"','validateLicenseEmail(adminLicenseEmail)','id="license-buyer-email-error"','aria-describedby={adminLicenseEmailError']) assert.ok(app.includes(needle),needle);
  assert.ok(!/disabled=\{adminLicenseBusy\|\|!adminLicenseEmail\.trim\(\)\}/.test(app),'button no longer silently disabled on empty email');
});
test('R-03: dashboard order count uses the plural helper',()=>{
  assert.ok(app.includes("plural(data.orders.length, 'order')")); assert.ok(!/data\.orders\.length \+ ' orders'/.test(app));
});
test('R-04: Content Planner terminology is consistent (Plan post)',()=>{
  assert.ok(app.includes("modal === 'Post' ? 'Plan ' : 'Add '")); assert.ok(!app.includes('Plan a post')); assert.ok(app.includes('Plan post</button>'));
});
test('R-05: setup hint sits in the screen-only toolbar, outside the printable page',()=>{
  const printable=app.slice(app.indexOf('className="invoice-print-root"'));
  assert.ok(!printable.slice(0,printable.indexOf('</Dialog>')).includes('invoice-setup-hint'),'hint must not be inside invoice-print-root');
  const toolbar=app.slice(app.indexOf('className="invoice-toolbar"'),app.indexOf('className="invoice-print-root"'));
  assert.ok(toolbar.includes('invoice-setup-hint'));
});
test('R-06: View all / View notes / dashboard links get 44px targets; dark back arrow styled',()=>{
  assert.ok(/\.shell \.panelheader \.link,\.shell \.link\{[^}]*min-height:44px/.test(css));
  assert.ok(/\.theme-dark \.sidebar-toggle\{/.test(css));
});
test('R-07: no literal whitespace/text nodes directly inside table structure',()=>{
  const bad=[];
  for(const m of app.matchAll(/<table\b[\s\S]*?<\/table>/g)){
    const block=m[0];
    for(const t of block.matchAll(/<\/(tr|thead|tbody|table)>[ \t]*(\{' '\}|[^<\s{)}][^<]*)/g)) bad.push(t[0].slice(0,40));
    for(const t of block.matchAll(/<(tr|thead|tbody|table)\b[^>]*>[ \t]*(\{' '\}|[^<\s{][^<]*)/g)) bad.push(t[0].slice(0,40));
    for(const t of block.matchAll(/<\/t[dh]>[ \t]*\{' '\}/g)) bad.push(t[0]);
  }
  assert.deepEqual(bad,[]);
  for(const m of app.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)){
    const top=m[1].replace(/<(td|th)\b[^>]*>[\s\S]*?<\/\1>/g,'').trim();
    assert.equal(top,'','non-cell content directly in <tr>: '+top.slice(0,60));
  }
});
test('R-08: product images are fetched once per product, not re-fetched on every product change',()=>{
  assert.ok(app.includes('loadedImageIds')); assert.ok(app.includes('[user,productIdsKey]'));
  assert.ok(app.includes("localStorage.getItem('sbcc_debug_timing') === '1'"));
});
test('R-01: Dialog restores focus via the shared planner (no bare trigger.focus timeout)',()=>{
  assert.ok(dlg.includes('scheduleRestore(opener)')); assert.ok(dlg.includes('decideRestore')); assert.ok(!dlg.includes('setTimeout(() => trigger.focus(), 0)'));
});

test('Fix2: license email focus runs after render via effect, not a bare timeout',()=>{
  assert.ok(app.includes('licenseEmailFocusTick')); assert.ok(!app.includes("window.setTimeout(() => document.getElementById('license-buyer-email')"));
});
test('Fix1/3: Dialog keeps the original opener; App guards page changes and restores focus after record actions',()=>{
  assert.ok(dlg.includes('resolveOpener')); assert.ok(dlg.includes('export function restoreFocusAfter'));
  assert.ok(app.includes('decidePageChange')); assert.ok(app.includes('restoreFocusAfter(startedFrom)'));
});
test('Fix4: order picker and save validation share availableForOrder',()=>{
  assert.ok((app.match(/availableForOrder\(/g)||[]).length>=2);
});
test('Fix5: CSRF token is cached (one GET per session, not per save)',()=>{
  const c=require('fs').readFileSync('src/local-laravel-client.ts','utf8');
  assert.ok(c.includes('if(csrfToken)return csrfToken;')); assert.equal((c.match(/fetch\('\/api\/csrf'/g)||[]).length,1);
});
test('Fix6: invoice print CSS hides on-screen chrome and sets A4',()=>{
  const m=css.match(/@media print\{[\s\S]*$/m); assert.ok(css.includes('@page')); assert.ok(/\.no-print/.test(css));
  assert.ok(/size:\s*A4/i.test(css),'A4 page size declared');
});

test('per-page URLs: App uses history paths, not #hash, and keeps login redirect on /dashboard',()=>{
  assert.ok(!app.includes('window.location.hash ='));  assert.ok(app.includes("'popstate'")); assert.ok(app.includes('pathForPage'));
  const login=require('fs').readFileSync('../backend/public/local-login.html','utf8'); assert.ok(login.includes("location.assign('/dashboard')"));
  assert.ok(require('fs').readFileSync('index.html','utf8').includes('noindex'),'SPA shell must be noindex');
  const web=require('fs').readFileSync('../backend/routes/web.php','utf8'); assert.ok(web.includes('Site::APP_PATHS')&&web.includes('Pages::slugs()'));
});
