# Local setup and verification on Windows (PowerShell)
Nothing below was executed by the author (Linux sandbox without Composer/npm network access). Run it yourself and report errors back.
**Safety:** the tests use a throw-away PostgreSQL *schema* (`sbcc_test_<random>`) inside your local DB and never touch `public`. Still, take a backup first (step 2). Do not run `migrate:fresh`, `db:wipe` or `migrate:reset` against your real database.

## 0. Requirements
PHP 8.2+ (XAMPP: `C:\xampp\php`) with extensions `pdo_pgsql`, `pgsql`, `mbstring`, `openssl`, `fileinfo` enabled in `php.ini`; Composer 2; Node.js 20+; PostgreSQL 14+ running locally; Git.

## 1. Get the branch (do not merge to main)
```powershell
cd "E:\Etsy Product"
git clone https://github.com/Web864/small-business-command-center.git SBCC-audit
cd SBCC-audit
git checkout audit/fixes
```
(Or in your existing folder: `git fetch origin; git checkout audit/fixes`.)

## 2. Back up your database first
```powershell
& "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" -U sbcc_app -h 127.0.0.1 -Fc -f "$HOME\sbcc_backup_$(Get-Date -Format yyyyMMdd_HHmm).dump" sbcc_local
```
(Adjust the PostgreSQL version folder. You will be prompted for the DB password.)

## 3. Backend install and config
```powershell
cd backend
$env:Path = "C:\xampp\php;" + $env:Path
php -v
php -m | Select-String -Pattern "pdo_pgsql|pgsql|mbstring|openssl|fileinfo"
composer install
Copy-Item .env.example .env   # skip if you already have a .env
php artisan key:generate      # only if APP_KEY is empty
notepad .env                  # set DB_PASSWORD, SBCC_PRIMARY_OWNER_EMAIL
php artisan config:clear
php artisan migrate --pretend # shows SQL only; changes nothing
```
Apply migrations to your **existing local DB** only if `php artisan migrate:status` shows pending ones (they are additive): `php artisan migrate`.

## 4. Run the backend tests (isolated schema)
```powershell
php tests/run-local.php
```
Expect: "Isolated PostgreSQL schema created", then PHPUnit output. Report the full output, especially failures. Suites: `LocalIntegrationTest`, `OwnerAuthorizationTest`, `OwnerPasswordResetTest`, `WorkspaceIsolationTest`, `AuditRegressionTest`, `CommercialFlowsTest`. Remove leftover test schemas later with `psql`: `\dn` then `DROP SCHEMA "sbcc_test_xxxx" CASCADE;` (only names starting `sbcc_test_`).

## 5. Frontend install, test and typecheck
```powershell
cd ..\frontend
npm ci
npm test
npm run typecheck
npm run build
```

## 6. Run the app in development (two terminals)
```powershell
# terminal 1
cd ...\backend; php artisan serve --host=127.0.0.1 --port=8000
# terminal 2
cd ...\frontend; npm run dev
```
Open http://127.0.0.1:5173 (use 127.0.0.1 consistently). Click Sign in; the login page is `/login`.

## 7. Verify the production-style build served by Laravel
```powershell
cd ...\frontend
npm run build:laravel      # writes backend\public\spa
cd ..\backend
php artisan serve --host=127.0.0.1 --port=8000
```
Open http://127.0.0.1:8000/ — you should see the React app (not the old prototype). Assets must load from `/spa/assets/...` (browser DevTools → Network, no 404s). Then test: sign in, create a product/order/customer, refresh, sign out and in, **Profile → Change Password** (change and sign in with the new password). `backend\public\spa` is git-ignored.

## 8. Environment variables (backend/.env)
| Variable | Purpose | Local value |
|---|---|---|
| APP_ENV / APP_DEBUG | environment / debug pages | local / true; **production / false** when deployed |
| APP_KEY | encryption key (`php artisan key:generate`) | required |
| APP_URL | public URL | http://127.0.0.1:8000 |
| FRONTEND_URL | where `/` redirects in local env when no SPA build | http://127.0.0.1:5173 |
| DB_CONNECTION, DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD | PostgreSQL | pgsql, 127.0.0.1, 5432, sbcc_local, sbcc_app, (yours) |
| DB_SCHEMA, DB_SSLMODE, DB_URL | optional schema / SSL / URL | public, prefer |
| SESSION_DRIVER, SESSION_LIFETIME, SESSION_ENCRYPT, SESSION_SAME_SITE, SESSION_COOKIE, SESSION_DOMAIN | sessions | file, 120, true, lax |
| SESSION_SECURE_COOKIE | HTTPS-only cookie | false locally; **true** in production |
| CACHE_STORE, CACHE_PREFIX | cache | file |
| LOG_CHANNEL, LOG_LEVEL | logging | stack, debug (warning in production) |
| SBCC_PRIMARY_OWNER_EMAIL | the only email that can be Primary Owner | your owner email |
| TRUSTED_PROXIES | proxy IPs or `*` behind TLS proxy | empty locally |
| APP_PREVIOUS_KEYS, APP_LOCALE, APP_NAME | key rotation / locale / name | optional |
Template for servers: `backend/.env.production.example`.

## 9. Owner account (existing install)
```powershell
php artisan sbcc:owner-status 'you@example.com'
```
See `backend/docs/OWNER_ACCESS.md`. Create the owner **before** allowing public registration.
