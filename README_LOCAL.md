# Small Business Command Center: local React + Laravel + PostgreSQL

Verified on 2026-11-24. Open **http://127.0.0.1:5173/**.

## Start the application

PostgreSQL must already be running. The local `.env`, private application key, PostgreSQL connection, and all three additive migrations are configured on this machine. A local owner account already exists; its password was not changed.

PowerShell terminal 1:

```powershell
Set-Location 'E:\Etsy Product\SBCC-Integrated\backend'
& 'C:\xampp\php\php.exe' artisan serve --host=127.0.0.1 --port=8000
```

PowerShell terminal 2:

```powershell
Set-Location 'E:\Etsy Product\SBCC-Integrated\frontend'
$env:Path = 'C:\Program Files\nodejs;' + $env:Path
& 'C:\Program Files\nodejs\npm.cmd' run dev
```

Use `127.0.0.1`, consistently. Sign in through the React app's existing **Sign in / Create account** button. Vite proxies `/api` and `/local-login` to Laravel. Successful login returns to the React app. In the local environment, visiting backend `/` redirects to React rather than showing the legacy QA interface.

If a process already owns either port, use its existing terminal or stop that process before starting another copy. Vite now refuses to silently choose another port.

## Root causes and fixes

The integrated backend had no `.env` and no `APP_KEY`. Laravel raised `MissingAppKeyException` while initializing encrypted sessions, causing `/api/session` to fail before authentication. Created a private key and reused only database settings from the existing local Laravel project. No credentials are included here.

The profile migration was also pending, which would have caused authenticated `/api/me` requests to fail. Applied the profile migration and a new additive image table migration. All existing application records were preserved.

A second failure affected API requests without an `Accept` header: Laravel tried to generate a missing named `login` route. Configured a guest redirect target and JSON error rendering for API paths. Signed-out `/api/session` now returns JSON `401` with or without the header.

The frontend TypeScript resolver lacked the Vite SDK alias. Added the matching TypeScript path and three optional fields to the existing license state type. Retained the reference application's unused declarations by disabling unused-code diagnostics; strict type checking remains enabled. The build now runs TypeScript before Vite.

## Authentication and compatibility

- Laravel uses encrypted file sessions with an HttpOnly, host-only, SameSite=Lax cookie. HTTP local development uses a non-secure cookie. No cross-origin cookie configuration is needed through Vite.
- `/api/csrf` initializes the session token. Writes use `X-CSRF-TOKEN` and same-origin credentials. Login rotates the session; logout invalidates it. The adapter shares concurrent token initialization, invalidates stale tokens after `419`, and resets local revision/token state on session restoration/logout.
- Roles, owner access, license issue/redeem/activate/release/reset/revoke, and the original hosted request/response shapes are mapped locally. License transfer activates an available installation; it does not bypass release/reset requirements.
- Workspace reads/writes retain optimistic revisions. Stale writes return `409 WORKSPACE_CONFLICT`. Orders, Products, Customers, Expenses, Content Planner, Notes, Dashboard, and Pricing Lab continue using the original workspace data model.
- Profile saves accept an empty display name and preserve currency. Currency changes must use conversion rather than relabeling existing money values.
- Avatar, logo, cover, and product image GET/POST/DELETE are implemented. Images are validated and stored privately per account in PostgreSQL, separately from the workspace size limit. Returned data URLs keep browser image requests private without requiring a public media endpoint.
- FX quote/conversion endpoints use [Frankfurter's documented reference-rate API](https://frankfurter.dev/). Only currency codes leave the backend. Quotes expire after ten minutes and are bound to the session. Conversion atomically updates the profile and all persisted monetary fields, checks the workspace revision, and preserves quantities, stock, and percentage discounts. Provider failures return `503` without changing amounts. The adapter tracks the new revision after conversion.

## Validation results

- Composer configuration valid; installed platform requirements all pass. PHP 8.2.12 includes `pdo_pgsql`, `pgsql`, and other required extensions.
- PostgreSQL connection verified; all three migrations show `Ran`; existing owner account confirmed without displaying account information.
- Backend: **15 tests, 92 assertions passed**. Covers login/logout/restoration, cookie session rotation with real CSRF middleware, guest JSON errors, owner roles, registration privilege restrictions, license lifecycle, workspace conflicts and isolation, private images, conversion atomicity, stale quotes/revisions, and provider failure.
- Frontend adapter: **6 tests passed**, including same-origin cookies, CSRF concurrency/expiration, endpoint mapping, session failures, and revision tracking.
- Strict TypeScript check and Vite production build pass. PHP syntax checks pass. Installed frontend dependencies resolve; the absent Linux-only optional Rollup package is expected on Windows.
- Real HTTP through Vite: React entry/login page/CSRF `200`; signed-out session `401`; valid CSRF with synthetic invalid login credentials `422`; missing or invalid CSRF `419`; session cookie is HttpOnly.
- A read-only PHP request to the live FX provider returned a valid rate. Automated currency tests use deterministic fake rates and do not convert real account data.
- No destructive migration/reset commands ran. No production services or data were accessed or modified.

Run checks again:

```powershell
Set-Location 'E:\Etsy Product\SBCC-Integrated\backend'
& 'C:\xampp\php\php.exe' tests/run-local.php

Set-Location 'E:\Etsy Product\SBCC-Integrated\frontend'
$env:Path = 'C:\Program Files\nodejs;' + $env:Path
& 'C:\Program Files\nodejs\npm.cmd' test
& 'C:\Program Files\nodejs\npm.cmd' run build
```

The backend runner creates an isolated `sbcc_test_<random>` PostgreSQL schema, migrates only that schema, and rolls synthetic records back after each test. Test schemas and their migration records are deliberately retained; application tables are never reset. The test account needs permission to create a schema in the local database. Direct PHPUnit execution without an isolated schema is rejected. Do not use the former RefreshDatabase workflow.

## Frontend preservation

The original reference directory's application source was not edited. Integrated CSS and `main.tsx` remain byte-for-byte identical. Integrated `App.tsx` differs only by three optional fields in a TypeScript state annotation; all runtime code, JSX, page layouts, styles, Dashboard, Orders, Products, Customers, Expenses, Pricing Lab, Content Planner, and Profile are unchanged. No simplified interface was substituted.

## Manual configuration and remaining limits

Owner authorization is now documented in [Primary Owner setup and security](backend/docs/OWNER_ACCESS.md). The current full backend suite passes **28 tests, 164 assertions**. The existing requested account is confirmed as Primary Owner; its account row and business records were preserved.

- Sign in with the existing local owner password. For existing-account promotion or explicit first-owner bootstrap, follow the linked Primary Owner documentation. Owner creation is now closed after an Owner exists; do not recreate existing accounts.

- On another machine, install Composer/npm dependencies, copy `.env.example` only if `.env` is absent, configure local PostgreSQL privately, generate a key only for a new installation, and run `artisan migrate`. Do not regenerate the configured key during normal startup.
- This startup flow uses the Vite development server. `npm run build` produces verified artifacts; `vite preview` is not configured as an authenticated API host. Production deployment was not part of this task.
- FX requires network access and trusted TLS certificates in PHP. Unsupported currency pairs or network failures are reported explicitly. Reference rates are not payment settlement rates.
- Existing limits remain: 400 rows per workspace collection, 180 KB workspace JSON, no automatic stale-tab merge, and the admin list returns the most recent 100 licenses. Browser UUID licensing does not attest physical hardware.
- Password reset, email verification, MFA, payment/refund processing, production backups/restore automation, import workflows, and production deployment remain outside this local integration. Financial values remain in the original frontend's numeric data model; no accounting architecture redesign was attempted.

## Files changed

Frontend: `package.json`, `tsconfig.json`, `vite.config.ts`, `src/local-laravel-client.ts`, one type annotation in `src/App.tsx`, and new `tests/local-client.test.cjs`. Generated `dist/` was rebuilt.

Backend: private `.env`; `.gitignore`; `bootstrap/app.php`; `config/app.php`; `config/database.php`; `routes/web.php`; `public/local-login.html`; `app/Http/Controllers/SbccController.php`; new `app/Http/Controllers/CompatibilityController.php`; new image-table migration; `database/factories/UserFactory.php`; `tests/TestCase.php`; `tests/Feature/WorkspaceIsolationTest.php`; new `tests/Feature/LocalIntegrationTest.php`; new `tests/run-local.php`; updated setup/bridge README pointers.

Root: this `README_LOCAL.md`. Original CSS was not changed. The later Primary Owner update adds a Mockery development dependency and updates the Composer lockfile; see its linked changed-file list.
