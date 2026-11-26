# 11 — Remaining Blockers (after the second pass)
Branch `audit/fixes`; never merged into `main`; nothing deployed. Executed here: frontend adapter tests (6/6 pass) and PHP/TS syntax checks only. **Every Laravel test is NOT TESTED** — Composer/packagist and PostgreSQL are unavailable in the sandbox.

## Done in this pass
- Change Password dialog: false "passwordless/Google/Apple/X" text and provider links replaced by a working form (current / new / confirm) calling `POST /api/password`. Only that dialog changed in `App.tsx`; it reuses the existing `modal`, `field`, `primary`, `action-cancel`, `currency-actions` classes, so no CSS edit. Not visually checked in a browser (NOT TESTED).
- `TRUSTED_PROXIES` moved from `env()` in `bootstrap/app.php` (silently null after `php artisan config:cache`) to `config/sbcc.php` + `AppServiceProvider`.
- 22 new backend test methods (login, password change, guest rejection, admin/customer authorization, licence redeem/device/revoke/reset, tenant isolation, workspace persistence/conflict/validation, profile).
- Docs: `docs/RELATIONAL_MIGRATION_PLAN.md`, `docs/LOCAL_SETUP_WINDOWS.md` (PowerShell commands + env var table).
- Reviewed commit `08332dd`: no defect found beyond the proxy-config issue above. Unverified assumption: `/spa/` asset base works with `vite build --base=/spa/` and Laravel static serving — confirm with step 7 of the setup guide.

## Blockers, in priority order
**P0 — before any deployment**
1. Run `php tests/run-local.php`, `npm run typecheck`, `npm run build:laravel` on your Windows machine; fix failures (the new tests were written without being run and may contain mistakes).
2. Browser-verify: sign in, every page, change password, SPA served from Laravel, no console/network errors.
3. Backups with a tested restore; staging HTTPS deployment with `.env.production.example`.
**P1 — before paying customers**
4. Relational data model (plan written, not implemented).
5. Password *reset* and email verification (needs mail provider; change-password now exists).
6. Licence expiry/renewal/payment issuance (needs payment provider and business rules).
7. Owner-first bootstrap procedure (email squatting) and verified-email requirement for redeem.
8. Terms, Privacy Policy, EULA; data export/deletion (export omits profile/images).
**P2** server-issued device tokens; CSP; CI pipeline; monitoring; minor-unit money and locales; image storage quotas; licence-list pagination.
**P3** remove AppDeploy shims, split `App.tsx`, owner email/paths in `backend/docs/OWNER_ACCESS.md` (decide if the repo is public).
**Decisions needed from you:** payment provider, mail provider, licence terms (expiry/renewal/trial), hosting target, SaaS vs customer-hosted vs installer.

Verdict unchanged: **NO-GO — NOT READY FOR COMMERCIAL LAUNCH**.
