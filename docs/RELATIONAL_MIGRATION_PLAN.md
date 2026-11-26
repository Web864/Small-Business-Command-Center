# Plan: JSON workspace blob → relational PostgreSQL tables
Status: PLAN ONLY. Nothing here has been implemented or run. No existing data is touched by this document.
Today: `workspaces.data` (jsonb, one row per user) holds `products, orders, customers, expenses, posts, notes`; saved whole via `PUT /api/workspace` with revision check; limits 400 rows/collection and 180 KB.
Entity fields come from `frontend/src/App.tsx:59-100`.

## Target tables (all `user_id` FK → users, ON DELETE CASCADE; ids stay the client-generated strings to keep the React app unchanged)
| Table | Key / columns |
|---|---|
| `products` | PK (`user_id`,`id`); name, sku, `price_minor` bigint, `cost_minor` bigint, stock int, min_stock int; unique (`user_id`,`sku`) where sku<>'' ; CHECK stock>=0 |
| `customers` | PK (`user_id`,`id`); name, email, phone, company, address, city, country, notes |
| `orders` | PK (`user_id`,`id`); customer text, status, order_date, scheduled_date, `paid_minor`, `refunded_minor`, `total_minor`, `shipping_minor`, `tax_minor`, `discount_minor`, `discount_percent` numeric(7,4), cancelled_at, cancel_reason; legacy single-line fields `product_id`,`qty`,`unit_price_minor` |
| `order_items` | PK (`user_id`,`order_id`,`line_no`); product_id, name, sku, qty, unit_price_minor, unit_cost_minor |
| `order_refunds` | PK (`user_id`,`order_id`,`id`); amount_minor, date, method, reference, note |
| `expenses` | PK (`user_id`,`id`); name, amount_minor, date |
| `posts` | PK (`user_id`,`id`); platform, caption, date, status |
| `notes` | PK (`user_id`,`id`); title, body, date, important bool |
Money as integer minor units with a per-profile currency exponent (JPY=0, USD=2, KWD=3); never floats. Index (`user_id`, date) on orders/expenses/posts; (`user_id`, status) on orders.

## Safe rollout (additive, reversible)
1. **Phase 0 – backup:** `pg_dump -Fc` of the database; restore-test into a scratch DB. Never skip.
2. **Phase 1 – additive migration:** create the new tables only; leave `workspaces` untouched. Migration `down()` drops only the new tables.
3. **Phase 2 – importer:** artisan command `sbcc:import-workspaces --dry-run` (default) reads each `workspaces.data`, validates every row (types, non-negative stock, totals vs items), writes a report of rejects, and only with `--commit` inserts inside one transaction per user, idempotent (upsert by key). It records the source `revision`.
4. **Phase 3 – dual-run:** new API (`/api/products`, `/api/orders` … with per-row validation and tenant-scoped queries) behind a feature flag; the old blob endpoints stay. Compare imported rows with the blob for each user.
5. **Phase 4 – cutover:** the frontend adapter (`local-laravel-client.ts`) maps the existing `PUT /api/workspace` shape onto the new endpoints so `App.tsx` stays unchanged, or `App.tsx` moves to per-entity calls in a separate approved change. Orders/stock changes happen in a DB transaction with `SELECT … FOR UPDATE` on products.
6. **Phase 5 – retire:** keep `workspaces` read-only for one release as a rollback path, then archive.

## Tests required before cutover
Importer round-trip equality per entity; money conversion exactness (incl. 0- and 3-decimal currencies); stock never negative under concurrent orders; tenant isolation per endpoint (A vs B); idempotent re-import; rollback restores the blob path; load test with ≥10,000 orders per tenant.
## Risks
Client-side business rules in `App.tsx` (totals, stock changes) must be re-implemented server-side and matched exactly; legacy orders with only `productId/qty` need normalising; float→minor rounding must be reviewed with the owner.
