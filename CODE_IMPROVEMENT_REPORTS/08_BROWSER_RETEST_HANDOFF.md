# 08 — Browser Retest Handoff (Windows, PowerShell)

Use a **disposable database and synthetic accounts only**. Never point at real business data.

```powershell
cd "E:\Etsy Product\SBCC-Integrated"
git fetch origin; git checkout ui-ux/f1-f9
# 1. Frontend checks
cd frontend; npm ci
npm test            # expect 30 passing
npm run typecheck   # first real typecheck of this branch
npm run build:laravel
# 2. Backend checks (isolated schema, see docs/LOCAL_SETUP_WINDOWS.md)
cd ..\backend; composer install
php tests\run-pure-rules.php          # expect 11 passed
php tests\run-local.php               # PHPUnit in a throw-away schema
# 3. Serve and run the browser specs
php artisan serve --host=127.0.0.1 --port=8000   # separate window, disposable DB
cd ..\frontend; npm i -D @playwright/test; npx playwright install chromium
$env:E2E_BASE_URL="http://127.0.0.1:8000"; $env:E2E_EMAIL="synthetic-owner@example.test"; $env:E2E_PASSWORD="<synthetic password>"
npx playwright test
```
Manual checklist: Tab/Shift+Tab inside each dialog; Escape; focus returns to opener; screen reader reads dialog title; Orders page at 768×1024 and 1024×768 (all columns + actions visible, badges on one line); invoice preview, Print preview (A4, teal) and PDF with and without a saved logo/name; archive → reload → restore for product and customer; expense/post/note edit, delete, Undo; Pricing Lab edge cases (fee 100, negative, blank); light/dark/warm themes.
