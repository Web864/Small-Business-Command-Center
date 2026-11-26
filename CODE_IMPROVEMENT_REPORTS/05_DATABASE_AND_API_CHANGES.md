# 05 — Database and API Changes

**Migrations required: none.** The workspace is one JSON document per user; new fields are optional and additive:
- `products[].archived` (true or absent), `customers[].archived` (true or absent)
- `expenses[].category` (one of Supplies, Shipping, Marketing, Software, Rent, Utilities, Other; absent = "Uncategorised")

Old records without these fields keep working. Currency conversion (`CompatibilityController::convert`) rewrites only money keys, so the new fields survive it (code-read, not executed).

## API behaviour
`POST|PUT /api/workspace` (same payload, same CSRF/session/licence checks, same 409 `WORKSPACE_CONFLICT` on stale revision). New: inside one transaction with a row lock, the server compares the new document with the stored one and rejects with **422 `{"error":…,"code":"RECORD_RULE"}`** when:
1. `archived` is anything but `true`/absent; expense category not in list; expense amount negative/non-numeric; post status/platform outside the allowed values (new/changed rows only — untouched legacy rows never block a save).
2. A SKU is duplicated (archived products keep SKU reserved) on a new/changed product.
3. A product or customer referenced by an order is removed (must archive instead).
4. A paid or refunded order is removed.
5. A new/edited order adds an archived product, or a new order targets an archived customer.

**Intentional exception:** saving a completely empty workspace (the existing "Clear all records" action) is still allowed — it is the owner's explicit reset and the confirm dialog says it cannot be undone. Decision for the owner if this should be tightened.
