# 06 — Security and Data Safety

- CSRF, CORS, session protection, licence enforcement, Primary Owner controls: **untouched**. No credentials hard-coded (Playwright reads `E2E_EMAIL`/`E2E_PASSWORD`).
- Tenant isolation: unchanged (workspace row looked up by authenticated `user_id`; rules only see that user's old/new data). Cross-tenant PHPUnit test written, **not run**.
- No frontend-only state for archive/delete: every action goes through `save()` → `PUT /api/workspace`; server re-validates. Undo re-saves through the same path.
- Historical financial records: orders keep resolving archived products/customers; paid/refunded orders cannot be deleted (UI and now server); deleting referenced products/customers is rejected.
- Behaviour changes to be aware of: currency, password and form dialogs no longer close on backdrop click; native `confirm()` for revoke/reset licence and "Clear all records" replaced by in-app confirms (same wording intent, same actions).
- Race handling: `saveWorkspace` now takes a row lock and re-checks revision; stale tabs still get 409.
- Not done / not verified: no destructive DB operations were run; no real data touched; nothing deployed.
