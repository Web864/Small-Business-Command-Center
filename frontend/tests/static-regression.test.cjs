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
  for(const needle of ['role={role}','aria-modal="true"','aria-labelledby={titleId}','inert','Escape','nextTrappedFocus','trigger.focus']) assert.ok(dlg.includes(needle),needle);
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
