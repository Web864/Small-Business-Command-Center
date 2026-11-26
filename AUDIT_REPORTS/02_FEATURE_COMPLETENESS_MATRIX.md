# 02 — Feature Completeness Matrix
Status is from code reading only. No feature was exercised at runtime, so none can be PASS; "PARTIAL" means implemented in code but not run.

| Feature | UI | Backend | Database | Tests | Status | Evidence |
|---|---|---|---|---|---|---|
| Dashboard / analytics | `App.tsx` (client-side maths) | none (derived client-side) | blob | none | NOT TESTED | no server calculations; no tests found |
| Orders | `App.tsx` | generic blob save | `workspaces.data` | none for logic | NOT TESTED | no server-side totals/stock validation (`SbccController.php:90`) |
| Products / inventory | `App.tsx` | blob + image endpoints | blob, `sbcc_images` | image tests only | NOT TESTED | stock logic is client-side |
| Customers | `App.tsx` | blob | blob | none | NOT TESTED | |
| Expenses | `App.tsx` | blob; FX conversion covers amounts | blob | FX tests | NOT TESTED | `CompatibilityController.php` convert |
| Content Planner (`posts`) | `App.tsx` | blob | blob | none | NOT TESTED | |
| Pricing Lab | `App.tsx` | none | none | none | NOT TESTED | client-only |
| Profile / settings | `App.tsx` | `saveLocalProfile` | `sbcc_profiles` | `LocalIntegrationTest` | PARTIAL | currency change blocked except via convert |
| Registration / login / logout | `/login` page | `register`, `login`, `logout` | `users` | `LocalIntegrationTest` | PARTIAL | case-variant duplicate email gave a DB error before fix |
| Password change | UI says passwordless (false) | added on branch (`POST /api/password`) | `users` | added, unrun | PARTIAL | UI not wired (approval needed) |
| Password reset / email verify / MFA | none | none | `password_reset_tokens` unused | none | NOT IMPLEMENTED | needs mail provider |
| Role-based access | n/a | `RoleManager`, `isManager` | `users.role` | `OwnerAuthorizationTest` | PARTIAL | `changeRole` has no caller/route |
| Licence issue/redeem/release/reset/revoke | admin panel | `SbccController` | `licenses` | `LocalIntegrationTest` | PARTIAL | no expiry/renewal/payment |
| Device management | licence panel | installation header check | `licenses.installation` | one test | PARTIAL | browser-chosen UUID |
| Export | button | `export` | blob | none | PARTIAL | omits profile and images |
| Currency conversion | UI | quote + convert | blob | 3 tests | PARTIAL | floats; external API |
| Installer | none | none | none | none | NOT IMPLEMENTED | |
