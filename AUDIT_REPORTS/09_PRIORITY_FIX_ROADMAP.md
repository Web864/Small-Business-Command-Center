# 09 — Priority Fix Roadmap and Before/After
## Before/after of changes made on `audit/fixes` (none executed; PHP lint only)
| ID | Before | After | Regression test (unrun) |
|---|---|---|---|
| A-01 | `/local-login` 404 outside local | `/login` and `/local-login` always served; client redirects to `/login`; page text de-localised | `test_login_page_is_available_outside_local_environment...`; `local-client.test.cjs` |
| A-02 | `/` served legacy prototype | serves `public/spa/index.html`; local redirects to Vite; else 503; `npm run build:laravel` builds into `backend/public/spa` | `test_root_does_not_serve_legacy_prototype...` |
| A-04 | no password change | `POST /api/password` (current password, min 10, throttled, audited) | `test_password_change_*` |
| A-05/10 | no htaccess/storage/prod env/headers | added all, plus `TRUSTED_PROXIES` | `test_responses_carry_baseline_security_headers` |
| A-07 | case-variant email → 500 | normalised before validation | `test_register_normalizes_email_case...` |
| A-11/13/14 | unbounded audit rows; first-request race; unthrottled licence calls | removed per-save audit; race handled; throttle 20/min | covered by existing licence tests |

## Remaining work
**P0 (before any deployment):** run the full backend and frontend suites and the new tests on a real machine and fix failures (L; needs PHP/Node/PostgreSQL); browser-verify sign-in and the SPA served from Laravel (M); provision backups and a tested restore (M).
**P1 (before paying customers):** A-03 move data to relational tables with server validation (XL; acceptance: orders/stock/totals enforced server-side, >5,000 rows load); A-04 reset + email verification + UI copy fix (L; needs mail provider and your approval for UI text); A-06 licence expiry/renewal/payment issuance (L; payment provider); A-08 owner-first bootstrap runbook (S); legal documents (external).
**P2:** A-09 server-issued device tokens (M); A-12 decimal/minor-unit money, locales, image storage with quotas (L); CSP, monitoring, CI (M); pagination for licence list (S); data export/deletion (M).
**P3:** A-15/16/17 clean-ups, split `App.tsx`, remove AppDeploy shims.
Each item needs acceptance tests written before closing.
