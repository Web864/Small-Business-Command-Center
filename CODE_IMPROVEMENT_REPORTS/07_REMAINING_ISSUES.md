# 07 — Remaining Issues (prioritised)

1. **P0 – Build unverified.** `npm run build` / `tsc` could not run here. Run `npm ci && npm run typecheck && npm run build:laravel` first; expect possible type errors in `App.tsx` that React types would reveal.
2. **P0 – No browser verification** of any fix (F1–F9). Orders-table container-query layout (F3), 44px targets (F8), invoice print/PDF (F6) and focus behaviour (F1) are the highest visual risk.
3. **P1 – Backend tests unrun** (`RecordManagementTest` and existing suites). Run `php tests/run-local.php` against a disposable schema.
4. **P1 – Dashboard-calculation tests missing** (logic is embedded in `App.tsx`; extract to `lib/` to test).
5. **P1 – Playwright selectors are unvalidated guesses** against the real DOM; expect first-run fixes.
6. **P2 – "Clear all records"** remains an allowed destructive reset (see 05).
7. **P2 – Archived customers named only by order** are materialised into the customers list when archived; renaming a customer does not rewrite past order names (pre-existing design).
8. **P2 – Expense category** has no report/breakdown view yet (only stored, filterable data is exposed via `expenseTotalsByCategory`, unused in UI).
9. **P2 – Browser support assumptions:** `inert`, container queries (Chrome 105+, Safari 16+, Firefox 110+).
10. **P3 – Large `App.tsx`** (~2.9k lines) still monolithic; relational migration plan unchanged (`docs/RELATIONAL_MIGRATION_PLAN.md`).
