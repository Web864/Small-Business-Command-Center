# Primary Owner authorization

The existing database uses `users.role` (`owner`, `admin`, `customer`, plus legacy non-manager roles). No schema change is required. **Primary Owner** means an account whose database role is `owner` and whose email matches the trusted server's `SBCC_PRIMARY_OWNER_EMAIL`. React still receives `role: owner`; no frontend or CSS changes are involved.

## This installation

The requested account `thelogic266@gmail.com` already had role `owner` and was the sole Owner before this task. It is now the configured Primary Owner. Its password, user ID, account identity, and business records were compared before and after executing the command twice. The commands made no user-row changes because it was already Owner.

Server `.env` now contains this non-secret designation alongside its existing private settings:

```dotenv
SBCC_PRIMARY_OWNER_EMAIL=thelogic266@gmail.com
```

Re-run safely from PowerShell:

```powershell
Set-Location 'E:\Etsy Product\SBCC-Integrated\backend'
& 'C:\xampp\php\php.exe' artisan config:clear
& 'C:\xampp\php\php.exe' artisan sbcc:grant-owner 'thelogic266@gmail.com' --confirm-email='thelogic266@gmail.com'
& 'C:\xampp\php\php.exe' artisan sbcc:owner-status 'thelogic266@gmail.com'
```

Expected output: `Already Primary Owner; no account changes made.`, followed by `Role: owner` and `Primary Owner: yes`. No password is requested, changed, or displayed. Normal startup does not require running promotion again. Restart long-running Laravel workers after server configuration changes; the existing `artisan serve` application boots per request.

## Explicit first-owner bootstrap on a new installation

Only a trusted server operator may set `SBCC_PRIMARY_OWNER_EMAIL` in the private environment. Set it to the intended account's email, then clear configuration cache. Verify the intended account's identity before promotion; matching an email alone is not proof of email ownership.

If the account **already exists** and **no Owner exists**:

```powershell
& 'C:\xampp\php\php.exe' artisan sbcc:grant-owner 'INTENDED_EMAIL' --confirm-email='INTENDED_EMAIL' --bootstrap
```

This changes only the role and normal update timestamp and writes a minimal role-change audit record. It never creates/replaces the user, resets the password, or edits workspaces, profiles, images, or licenses.

If neither the intended account nor any Owner exists:

```powershell
& 'C:\xampp\php\php.exe' artisan sbcc:create-owner 'INTENDED_EMAIL' --bootstrap
```

The CLI requests a hidden, private password. Creation is atomic and closes once any Owner exists. Existing accounts are rejected with a direction to use `sbcc:grant-owner`. Do not delete or recreate an existing account to get around this check.

When another Owner exists, promotion of the configured existing account is a **trusted server recovery** operation: use `sbcc:grant-owner` with explicit email confirmation and without `--bootstrap`. It preserves other accounts and roles. Only the configured Primary Owner receives account-role management authority. Repeating a successful promotion is a no-op, including audit records.

## Permission boundaries

| Account | License administration | Own workspace | Change account roles |
|---|---|---|---|
| Configured Primary Owner, role `owner` | Yes | Yes | Trusted server-side service only |
| Other existing Owner | Yes | Yes | No |
| Admin | Yes | Yes | No |
| Customer | No | Requires active license and matching installation | No |
| Guest | No | No | No |

- Existing HTTP routes continue to use Laravel's authenticated session user and database role. License management remains restricted by `isManager()`; customers cannot gain these rights by changing browser state or request fields.
- `User::$fillable` excludes `role`. Registration does not accept a role; PostgreSQL defaults it to `customer`. Profile validation excludes role fields, including for licensed customers. No HTTP owner-bootstrap or role-change endpoint was added.
- The `manage-account-roles` Gate grants access only to the configured Primary Owner with a persisted `owner` role. `RoleManager::changeRole($authenticatedActor, $target, 'admin'|'customer')` re-reads the actor from PostgreSQL before authorization. Future server controllers must pass the authenticated user, never a user ID supplied by the requester. This service does not permit promoting another Owner or demoting the configured Primary Owner.
- Bootstrap/recovery commands are limited to trusted CLI execution, an explicit server-configured email, and a repeated confirmation email. A first-owner grant requires `--bootstrap`; using first-owner bootstrap for a different account when Owners already exist is rejected. Missing or ambiguously case-matched accounts are rejected without creating users.
- Role operations are transactional, serialized using a PostgreSQL transaction advisory lock, and audited without passwords or business content. Identical repeat requests do not write again.
- Server/OS access, private environment access, and PostgreSQL administrative access remain trusted privileges. People holding those privileges can edit application code or the database directly; the application cannot prevent a trusted server administrator from doing so. Keep that access separate from customer logins.

## Tests and verification

Verified result: **28 tests, 164 assertions passed**, including all 15 previous integration tests and 13 new Owner authorization tests. PHP syntax checks and Composer validation also passed. Composer reported no security vulnerability advisories. All frontend source hashes were unchanged.

```powershell
Set-Location 'E:\Etsy Product\SBCC-Integrated\backend'
& 'C:\xampp\php\php.exe' tests/run-local.php
```

The runner migrates only a new isolated PostgreSQL test schema and rolls back synthetic data per test. No application schema migrations or destructive reset commands were run for this change. Generated test schemas are retained as in the existing workflow.

The suite covers first-owner bootstrap, explicit confirmation/configuration, recovery, idempotency, preservation of existing data, atomic first-owner creation, closed creation after an Owner exists, Owner/Admin/Customer permissions, revoked/stale actor authority, role-mass-assignment attacks, registration and licensed-profile tampering, Primary Owner demotion protection, and status reporting. It also reruns all existing authentication, session, CSRF, licensing, image and currency tests. Mockery was added as a development dependency because Laravel's interactive Artisan command tests require it.

## Changed files

- New: `config/sbcc.php`, `app/Services/RoleManager.php`, `app/Console/Commands/GrantOwner.php`, `app/Console/Commands/OwnerStatus.php`, `tests/Feature/OwnerAuthorizationTest.php`, this document.
- Updated: `app/Console/Commands/CreateOwner.php`, `app/Models/User.php`, `app/Providers/AppServiceProvider.php`, registration in `app/Http/Controllers/SbccController.php`, `.env.example`, private `.env`, `composer.json`, `composer.lock`, and the root local README's owner setup instructions.
- No React/CSS edits, database migrations, password changes, or account/business-record recreation.

## Local-only Primary Owner password reset

Final regression result: **34 tests, 202 assertions passed** (including six password-reset tests). PHP syntax validation passed.

Run in your own interactive PowerShell terminal:

```powershell
Set-Location 'E:\Etsy Product\SBCC-Integrated\backend'
& 'C:\xampp\php\php.exe' artisan sbcc:reset-owner-password 'thelogic266@gmail.com'
```

Confirm the reset when prompted (default is No), then enter the new password twice in hidden prompts. Use 12 to 72 bytes (ASCII characters each use one byte). Visible-input fallback is disabled: an incapable terminal aborts instead of echoing the password. Do not supply passwords through command arguments, environment variables, chat, or redirected input.

This command requires APP_ENV=local, interactive CLI access, and exactly one existing account matching the configured Primary Owner with database role owner. It changes only users.password using Laravel Hash::make, preserving ID, email, role, Primary Owner configuration, remember_token, timestamps, and all business records. It creates no users, writes no audit/password logs, and runs no migrations. Registration and HTTP routes cannot invoke the reset.

Before committing, it verifies the saved password through the configured Laravel web authentication provider; verification failure rolls back the transaction. Success prints: **Password reset complete. Laravel authentication verified. Only the password hash changed.** No plaintext password is printed or logged. The actual account's reset remains pending until the operator runs the command privately. After success, sign in at http://127.0.0.1:5173 using the existing email and your new password.

Tests use synthetic passwords and an isolated PostgreSQL schema. They verify authentication with the new password, rejection of the old password, single-column preservation, cancellation, missing/wrong/Customer accounts, non-local/unattended execution, and mismatched/short/overlength passwords. No React/CSS files were edited.
