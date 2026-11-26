# 03 — Bugs and Security Findings
Method: static source review of `e4fd50a`; none reproduced at runtime. Line numbers refer to `e4fd50a`. Status column shows what the `audit/fixes` branch does (untested: PHPUnit could not run).
Totals: **2 Critical, 3 High, 6 Medium, 4 Low**.

| ID | Sev | Finding | Location | Release blocker | Status on branch |
|---|---|---|---|---|---|
| A-01 | CRITICAL | React sign-in redirects to `/local-login`, which is 404 outside local/testing, so customers cannot sign in to the React app in production | `local-laravel-client.ts:63`, `routes/web.php:20` | YES | FIXED (route ungated, `/login` added) — unrun |
| A-02 | CRITICAL | Non-local `/` serves the legacy QA prototype (`public/app`), not the React build; `dist/` is gitignored and never served | `routes/web.php:4`, `public/app/app.js:1` | YES | FIXED (serves `public/spa`; 503 if missing; `build:laravel` script) — unrun |
| A-03 | HIGH | Business data is a single JSON blob; ≤400 rows/collection, ≤180 KB; server validates only that rows have a string `id`; no server-side totals/stock checks | `SbccController.php:90-100` | YES | NOT FIXED (redesign) |
| A-04 | HIGH | No password reset, email verification or change; UI claims passwordless (`App.tsx:2428`) | `App.tsx:1588,2428` | YES | PARTIAL: change endpoint added; reset/verify need mail; UI copy needs approval |
| A-05 | HIGH | No deploy tooling, `.htaccess`, storage dirs, CI, backups | repo tree | YES | PARTIAL: htaccess, storage dirs, prod env template added; CI/backups not |
| A-06 | HIGH (paid sales) | Licence has no expiry/renewal/trial/suspend or payment webhook | `licenses` migration | YES for selling | NOT FIXED (business decision + payment provider) |
| A-07 | MEDIUM | Case-variant duplicate email passes `unique` (checked before lowercasing) then violates DB unique index → 500 | `SbccController.php:33-35` | no | FIXED (normalise before validate) — unrun |
| A-08 | MEDIUM | Primary-Owner email squatting: open registration, no email verification; operator who runs `grant-owner --bootstrap` after an attacker registered the owner email would promote the attacker's account | `RoleManager::grantPrimaryOwner` | conditional | NOT FIXED: operational rule — create the owner via `sbcc:create-owner` before opening registration |
| A-09 | MEDIUM | Device binding is a client-chosen UUID in localStorage/cookie; copyable | `App.tsx:297`, `local-laravel-client.ts:7` | no | NOT FIXED |
| A-10 | MEDIUM | Insecure example defaults (`APP_ENV=local`, `APP_DEBUG=true`, `SESSION_SECURE_COOKIE=false`); no security headers / trusted proxies | `.env.example`, `config/session.php:7` | config | FIXED: `.env.production.example`, `SecurityHeaders` middleware, `TRUSTED_PROXIES` — unrun. CSP still missing |
| A-11 | MEDIUM | An `audit_events` row on every workspace save: unbounded growth | `SbccController.php:106` | no | FIXED (per-save audit removed) |
| A-12 | MEDIUM | Images stored as base64 text, no per-user quota, orphans after product delete; money kept as JSON floats rounded to 2 dp (breaks zero-decimal currencies); fixed UTC | `CompatibilityController.php:25-45,91` | international | NOT FIXED |
| A-13 | LOW | `firstOrCreate` workspace race can 500 | `SbccController.php:19` | no | FIXED — unrun |
| A-14 | LOW | Licence activate/release unthrottled | `routes/web.php` | no | FIXED (20/min) — unrun |
| A-15 | LOW | Admin licence list capped at 100, UI hardcodes `hasMore:false`; register leaks account existence; throttles per IP only | `SbccController.php:124`, `local-laravel-client.ts:51` | no | NOT FIXED |
| A-16 | LOW | Owner's real email and Windows paths committed in docs | `backend/docs/OWNER_ACCESS.md:7,12,20` | privacy | NOT CHANGED — your decision; check if the repo is public |
| A-17 | INFO | AppDeploy alias/`appdeploy.auth-login.json`; 2,627-line `App.tsx`; `noUnusedLocals:false` | `vite.config.ts:9`, `tsconfig.json:138` | no | NOT FIXED |

No hardcoded secrets or committed `.env` were found in the working tree (`.env*` ignored). Git history contains one commit; history scan beyond that NOT TESTED.
