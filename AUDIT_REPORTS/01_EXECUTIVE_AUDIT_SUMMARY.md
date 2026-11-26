# 01 — Executive Audit Summary
Repo `Web864/Small-Business-Command-Center`, branch `main`, commit `e4fd50a67f78fa2e6db1bcfd6998bc60730b12ff` (2026-11-25). Fixes are on branch `audit/fixes`.

**Evidence limit (read first):** this sandbox has no `vendor/`, no `node_modules`, no network for package installs and no running PostgreSQL. The audit is therefore **static review + PHP lint only**. No PHPUnit, `tsc`, Vite build, browser, load or database test was executed. Anything runtime is NOT TESTED, never PASS.

## What looks sound (VERIFIED by reading code)
- Server-side licence gate (`licensed()`, `SbccController.php:21`) is applied to workspace, export, profile, images and FX endpoints; managers bypass by role.
- Per-user workspace rows keyed by `user_id` (`workspaces` PK); no endpoint takes a user id from the client, so cross-tenant IDOR is not apparent.
- Licence keys stored as SHA-256 digests; redeem is transactional with `lockForUpdate`; role column is not mass-assignable; owner promotion is CLI-only and audited.
- CSRF, session regeneration on login, login/register throttles, optimistic revision check on workspace saves.

## Main problems (confirmed in source)
1. Production could not serve the React app: `/` served a legacy QA prototype and the React sign-in redirect (`/local-login`) returned 404 outside local/testing. **Fixed on branch** (build output served from `public/spa`, login page ungated).
2. All business data is one JSON blob per user, max 400 rows per collection and 180 KB; no server-side validation of orders/stock/totals. **Not fixed** (needs a relational redesign).
3. No password reset, email verification or password change; the UI text says the app has no passwords. Password-change endpoint added; reset/verification need a mail provider. UI copy not changed (needs your approval).
4. Licence system has no expiry, renewal, trial or payment integration; device binding is a browser-generated UUID.
5. No deployment tooling, CI, backups or monitoring; insecure example defaults. Partly fixed (htaccess, storage dirs, production env template, security headers).
6. No Windows installer exists; architecture is a hosted/self-hosted web app only.

## Verdict
**NO-GO — NOT READY FOR COMMERCIAL LAUNCH**, before and after the fixes. The fixes remove deployment blockers but none of them could be run here, and the data-model and licensing gaps remain. See `10_FINAL_RELEASE_VERDICT.md`.
