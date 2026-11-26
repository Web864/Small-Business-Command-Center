# 11 — Final browser regression remediation
Branch `ui-ux/r09-final-regression` (from `1c5d009`). Not merged, not deployed, no data touched.

| Fix | Before (browser) | After (code) | Status |
|---|---|---|---|
| 1 Focus | Save/Archive/Discard land on `main`; archived Restore leaves BODY | Root cause (code trace): React StrictMode (dev) mounts→cleans→re-mounts the Dialog effect; on the 2nd mount focus is already inside the dialog, so the recorded "opener" was a dialog control that later unmounted → fallback `main`. `resolveOpener` keeps the original opener per dialog instance. Non-dialog record actions (Restore) now call `restoreFocusAfter`. No new fixed delays (poll only while opener is disabled). | FIXED-UNVERIFIED-IN-BROWSER |
| 2 License email focus | Malformed email sometimes leaves focus on main/Issue | Focus applied by effect after the error renders, with rAF retries until the input is active | FIXED-UNVERIFIED-IN-BROWSER |
| 3 Dialog after navigation | Order dialog visible on Dashboard | `decidePageChange`: clean dialog closes on page change; dirty form reverts hash/page and shows Discard confirm, then navigates on confirm | FIXED-UNVERIFIED-IN-BROWSER |
| 4 Inventory 8 vs 9 | Order form 8, Products 9 | Confirmed code discrepancy: picker showed `stock − all reserved` (incl. the order being edited) while save validation allowed `+ own lines`. Picker and validation now share `availableForOrder`. Not reproduced in a browser; the tester's exact 8/9 scenario is unconfirmed (stale async state not ruled out). Stock tests cover create/edit/cancel/complete/refund/legacy. No stored data altered. | PARTIAL — consistency bug fixed, original observation unconfirmed |
| 5 API overhead | PUT ~385 ms vs controller 17–22 ms; csrf ~190 ms; session ~290 ms | Code review only: CSRF token is cached (one GET per session, re-fetched once after `/api/session` or a 419), not per save. ~350 ms is outside controller/rules → PHP dev-server/proxy/network. **No optimization made; no improvement claimed.** Needs direct vs Vite-proxy timing (below). | NOT FIXED — NOT MEASURED HERE |
| 6 Quality | | 0/1/many order labels tested; setup hint stays out of printable page; A4 `@page` check; table whitespace guard passes; touch targets/dark arrow untouched | PASS (static) |

## Executed here
- `cd frontend && NODE_PATH=/opt/node22/lib/node_modules npm test` → 51 pass, 0 fail
- TS transpile syntax check (changed files) → 0 errors (NOT a typecheck)
- `php -l` all backend PHP clean; `php backend/tests/run-pure-rules.php` → 11 passed
- BLOCKED: tsc typecheck, `vite build`, PHPUnit, Playwright, perf measurement (no network → no node_modules/vendor; no PostgreSQL/server).

## Claude 1 retest handoff
1. `npm ci && npx tsc --noEmit && npm run build && npm test`; `php artisan test` on a disposable DB.
2. Dev server (StrictMode) AND production build: Save expense, Archive product (confirm), Discard form, Restore archived product, Esc on pristine dialog → record `document.activeElement` each time (expect opener, else a sibling control, never BODY/main unless list empty).
3. License form: empty, `a@b`, `x@y.z`, valid-format (use a disposable account) → focus on `#license-buyer-email` for invalid.
4. Open Order dialog → browser Back / hash to Dashboard: clean form closes; dirty form shows Discard confirm and stays on Orders until confirmed.
5. Edit an order holding N units: picker count should equal the validation limit and say "for this order"; Products page unchanged. Report if 8-vs-9 still appears (include steps).
6. Perf: `curl -s -o /dev/null -w '%{time_total}\n' http://127.0.0.1:8000/api/csrf` vs same via `:5173`; ×20 warm each; compare with `Server-Timing`.
