# 01 — Implementation Summary

Branch: `ui-ux/f1-f9` (from `audit/fixes` @ 884ab62). Code commit: **00d4b3b** (`00d4b3b3b7b7b89aebf845bf3e3078bdccb310f3`). Not merged to `main`. Not deployed.

## What was built
| Area | What changed |
|---|---|
| F1 Dialogs | New shared `Dialog` component (`frontend/src/components/Dialog.tsx`) used by all 8 dialogs: `role=dialog/alertdialog`, `aria-modal`, `aria-labelledby/describedby`, Escape, Tab focus trap (pure helper `lib/dialog.ts`), focus restored to the opener, background `inert` + `aria-hidden`, nested-dialog stack (only the top one is active). Labelled close buttons. Backdrop clicks no longer close forms/destructive confirms. Unsaved-data "Discard unsaved changes?" confirm. Consistent Cancel + Save row. |
| F2 Navigation | Skip link, `<nav aria-labelledby>`, `aria-current="page"`, `<main id="main-content" tabIndex=-1>`, polite live region (page changes, saves, failures), per-page `document.title`, icon-only buttons already had names (verified by scan), native `confirm()/alert()` removed everywhere. |
| F3 Orders table | Table switches to labelled cards when its container is < 900px (container query), so 768–1024px (with sidebar open) shows every column and every action; amounts, quantities and status badges never wrap; IDs/names/items wrap safely; query-aware empty states. |
| F4 Forms | `Field` supports required markers (`*` + screen-reader text), field-level errors, hints, `aria-invalid`, `aria-describedby`; forms are `noValidate` with a pure validator (`lib/validation.ts`); first invalid field focused; duplicate-SKU message; Tax no longer alone in a row (3-column grid); double-submit guard (ref + disabled button); form data preserved on error. |
| F5 Pricing Lab | Inputs are text + validated (no silent clamping); errors for blank/negative/non-numeric/fee ≥ 100%; warnings for unusually high fee, costs ≥ current price, price below suggested; margin **and** markup shown with an explanation; no NaN/Infinity; cent-precise round-up. Formula unchanged. |
| F6 Invoice | Teal palette in HTML preview and jsPDF; removed yellow LOGO rectangle, geometric placeholder and "My Business"; shows only the saved business name/logo (aspect-correct, PNG/JPEG/WebP, fetch fallback), otherwise a non-printing hint. A4 `@page` print rules. No address/tax invented. |
| F7 Dashboard & copy | Metrics visible by default (hide choice persisted in localStorage); greeting falls back to account name then "there" (never the email); plural helper; "Starting stock" → "Stock quantity" when editing; no-match states for products/customers/orders; "Content calendar" → "Content plan"; dark/warm header logo placeholder. |
| F8 Touch targets | ≥ 44px for icon buttons, nav, toggles, inputs on `(pointer:coarse)` or ≤ 1024px. |
| F9 Records | Server-persisted: product/customer **archive & restore** (Active/Archived views, history kept, SKU reserved, not selectable for new orders, excluded from pricing/alerts/search); expense **edit/delete + categories**; post **edit/delete**; note **delete**; confirmed deletes with **Undo** (restores just the deleted record). Server rules in `App\Support\WorkspaceRules` enforced inside `saveWorkspace`. |

## Design preserved
Teal identity, light/dark/warm themes, existing workflows (orders, refunds, currency conversion, license gate, Primary Owner controls), tenant isolation and historical records are unchanged. Order delete/refund rules were kept (now also enforced server-side).
