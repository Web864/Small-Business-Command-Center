# 03 — Files Changed (commit 00d4b3b vs 884ab62: 20 files, +1739 / −303)

| File | Change |
|---|---|
| `frontend/src/App.tsx` | Dialog adoption, validation, record actions, pricing state, pages, invoice, a11y (≈+817/−~300) |
| `frontend/src/index.css` | Appended F1–F9 CSS; invoice blue → teal |
| `frontend/src/components/Dialog.tsx` (new) | Dialog, CloseButton, ConfirmDialog |
| `frontend/src/lib/dialog.ts` (new) | focus-trap helper |
| `frontend/src/lib/pricing.ts` (new) | pricing maths + validation |
| `frontend/src/lib/records.ts` (new) | archive/category/plural/greeting helpers |
| `frontend/src/lib/validation.ts` (new) | field-level validators |
| `frontend/tests/lib.test.cjs`, `static-regression.test.cjs` (new) | 24 new node tests |
| `frontend/e2e/*.ts`, `frontend/playwright.config.ts` (new) | Playwright specs — **unrun** |
| `frontend/package.json` | `test` runs all node tests; `e2e` script (no new dependency, lockfile untouched) |
| `backend/app/Support/WorkspaceRules.php` (new) | server-side record rules |
| `backend/app/Http/Controllers/SbccController.php` | `saveWorkspace` now transactional, locks row, applies rules (422 `RECORD_RULE`) |
| `backend/tests/Unit/WorkspaceRulesTest.php`, `Feature/RecordManagementTest.php`, `run-pure-rules.php` (new) | rule + endpoint tests |
| `backend/phpunit.xml` | adds Unit suite |

Secret scan of the staged diff: no credentials, keys or tokens found. No generated artifacts (`node_modules`, `vendor`, `dist`, `public/spa`, `.env`) committed.
