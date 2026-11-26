# 10 — Post-browser-testing fixes (R-01 … R-08)

Branch `ui-ux/r01-r08`, based on `ec38501`. Nothing merged or deployed. No customer data touched.
Status key: FIXED-UNVERIFIED-IN-BROWSER = code + unit/static tests pass here, needs Claude 1 retest in a real browser.

| ID | Status | Change |
|----|--------|--------|
| R-01 | FIXED-UNVERIFIED-IN-BROWSER | `Dialog.tsx` restore planner (`scheduleRestore`/`flushRestore`, pure `decideRestore` in `lib/dialog.ts`): earliest opener wins, polls while opener is disabled (save/archive in flight, max 30x50ms), re-finds a re-rendered opener, falls back to first usable control in its container, then `#main-content`; never steals focus the user already placed. Escape + trap unchanged. |
| R-02 | FIXED-UNVERIFIED-IN-BROWSER | `validateLicenseEmail`; labelled field, `aria-invalid`, `aria-describedby`, `role="alert"` error, validate on blur and submit, focus to field. Server issuance/authorization untouched. |
| R-03 | FIXED | `plural()` for dashboard order count and reminder aria-label. |
| R-04 | FIXED | "Plan post" action; modal titles "Plan post" / "Add …" / "Edit …". |
| R-05 | FIXED-UNVERIFIED-IN-BROWSER | Setup hint moved out of printable invoice into screen-only `.no-print` toolbar. Business name/logo/totals kept. |
| R-06 | FIXED-UNVERIFIED-IN-BROWSER | 44px targets for `.link`, View all, notification items, toggles under coarse pointer / <=1024px. |
| R-07 | NOT REPRODUCED | Static scan finds no text/whitespace nodes directly in table elements; guard test added. Need the console warning's component stack from Claude 1. |
| R-08 | INSTRUMENTED, CAUSE NOT CONFIRMED | Measured here: PHP rules 0.2–1.5 ms, JSON 0.1–1.1 ms at 50–300 rows/collection (`backend/tests/bench-rules.php`) — not the cause. Added `Server-Timing` header on `PUT /api/workspace`, opt-in client timing (`localStorage.sbcc_debug_timing='1'` → `window.__sbccSaveTimings`, `__sbccApiTimings`). Removed redundant product-image refetch. Unproven hypotheses: single-threaded `php artisan serve`, session driver, license DB query. |
| Dark back arrow | FIXED | `.theme-dark .sidebar-toggle` rules. |
| Repeated session/license calls | NOT A DEFECT | Prod: one `/api/session`, one `/api/license`; dev duplicates are React StrictMode. |

## Tests (actually run)
- `cd frontend && NODE_PATH=/opt/node22/lib/node_modules npm test` → 42 pass, 0 fail
- TS transpile syntax check of changed TS/TSX → 0 errors
- `php -l` on all tracked backend PHP → clean
- `php backend/tests/run-pure-rules.php` → 11 passed, 0 failed
- BLOCKED (no network, no node_modules/vendor/PostgreSQL): `tsc` typecheck, `vite build`, PHPUnit, Playwright.

## Retest handoff for Claude 1
1. `npm ci && npm run build && npx tsc --noEmit`; `php artisan test` on a disposable DB.
2. R-01: Save, Discard (nested confirm) and Archive on products/orders/customers/expenses/posts/notes: `document.activeElement` must not be BODY; Esc and Tab trap still work.
3. R-02: issue form with empty/`a@b`/valid email: error announced, focus moves, valid email issues key.
4. R-03: dashboard with 0/1/3 orders. R-04: labels. R-05: print preview shows no setup tip.
5. R-06: 390px viewport, measure View all / View notes >= 44px.
6. R-07: report React warning stack.
7. R-08: set `localStorage.sbcc_debug_timing='1'`, save, read `window.__sbccSaveTimings` and `Server-Timing` (`lock`, `rules`, `total`) to locate the 2–4 s.
