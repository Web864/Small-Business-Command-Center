# 04 — Test Execution Results
Environment: Linux sandbox, PHP 8.3.6 (pdo_pgsql), Node 22.23.5, Composer present, `psql` client only; PostgreSQL server not running; `backend/vendor` and `frontend/node_modules` absent; package installs blocked by account network settings (not attempted).

| Command | Result |
|---|---|
| `php -l` on all changed/added PHP files (routes, controller, middleware, bootstrap, new test) | exit 0, no syntax errors (VERIFIED) |
| `node --check frontend/tests/local-client.test.cjs` | exit 0 (VERIFIED) |
| `NODE_PATH=/opt/node22/lib/node_modules npm test` in `frontend/` (uses the sandbox's global `typescript`) | **EXECUTED: 6 tests, 6 pass, 0 fail** (adapter tests only; includes the `/login` redirect expectation) |
| TypeScript `transpileModule` syntax check of `App.tsx`, `local-laravel-client.ts`, `main.tsx`, `vite.config.ts` | 0 syntax diagnostics. This is NOT a type check: React types are not installed, so `tsc --noEmit` is NOT TESTED |
| `php -l` on `CommercialFlowsTest.php`, `config/sbcc.php`, `AppServiceProvider.php`, `bootstrap/app.php` | exit 0 |

## NOT TESTED (cannot run here)
- Backend PHPUnit suite (`php tests/run-local.php`): 34 existing test methods read, not run; 6 methods in `AuditRegressionTest.php` and 22 in `CommercialFlowsTest.php` written, not run. README claims of 28 tests/164 assertions are NOT VERIFIED.
- `tsc --noEmit`, `vite build`, `npm run build:laravel`, ESLint (no `node_modules`; registry blocked by the sandbox proxy, HTTP 403).
- Browser E2E, responsive/accessibility, performance/load, `composer audit`, `npm audit`, DB concurrency, migrations rollback.

To run on your machine: `cd backend && composer install && php tests/run-local.php`; `cd frontend && npm ci && npm test && npm run build:laravel`.
