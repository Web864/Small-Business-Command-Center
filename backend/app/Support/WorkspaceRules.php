<?php
namespace App\Support;

/**
 * Server-side business rules for the workspace document (F9). Pure PHP: no framework, no database,
 * so the rules can be unit-tested anywhere. Rules only inspect rows that are NEW or CHANGED compared with
 * the stored workspace, so legacy rows saved before these rules existed never block unrelated edits.
 */
final class WorkspaceRules
{
    public const EXPENSE_CATEGORIES = ['Supplies','Shipping','Marketing','Software','Rent','Utilities','Other'];
    public const POST_PLATFORMS = ['Instagram','Pinterest','TikTok','Facebook'];
    public const POST_STATUSES = ['Draft','Planned','Posted'];

    /** @return string|null first violated rule (human readable), or null when the change is allowed */
    public static function validate(array $new, array $old): ?string
    {
        foreach (['products','customers'] as $table) {
            foreach (self::changed($new[$table] ?? [], $old[$table] ?? []) as $row) {
                if (array_key_exists('archived', $row) && $row['archived'] !== true) {
                    return 'The archived flag on '.$table.' must be true or omitted.';
                }
            }
        }
        foreach (self::changed($new['expenses'] ?? [], $old['expenses'] ?? []) as $row) {
            if (array_key_exists('category', $row) && $row['category'] !== null && $row['category'] !== '') {
                if (!is_string($row['category']) || !in_array($row['category'], self::EXPENSE_CATEGORIES, true)) {
                    return 'Expense category must be one of: '.implode(', ', self::EXPENSE_CATEGORIES).'.';
                }
            }
            if (isset($row['amount']) && (!is_numeric($row['amount']) || $row['amount'] < 0 || !is_finite((float)$row['amount']))) {
                return 'Expense amount must be a non-negative number.';
            }
        }
        foreach (self::changed($new['posts'] ?? [], $old['posts'] ?? []) as $row) {
            if (isset($row['status']) && !in_array($row['status'], self::POST_STATUSES, true)) {
                return 'Post status must be one of: '.implode(', ', self::POST_STATUSES).'.';
            }
            if (isset($row['platform']) && !in_array($row['platform'], self::POST_PLATFORMS, true)) {
                return 'Post platform must be one of: '.implode(', ', self::POST_PLATFORMS).'.';
            }
        }

        // Unique SKU (archived products keep their SKU reserved).
        $skus = [];
        foreach ($new['products'] ?? [] as $p) {
            if (!isset($p['sku']) || !is_string($p['sku'])) { continue; }
            $key = mb_strtolower(trim($p['sku']));
            if ($key === '') { continue; }
            $skus[$key][] = $p['id'];
        }
        foreach (self::changed($new['products'] ?? [], $old['products'] ?? []) as $p) {
            $key = isset($p['sku']) && is_string($p['sku']) ? mb_strtolower(trim($p['sku'])) : '';
            if ($key !== '' && count($skus[$key] ?? []) > 1) {
                return 'SKU "'.$p['sku'].'" is already used by another product (it may be archived).';
            }
        }

        $isFullReset = true;
        foreach (['products','orders','customers','expenses','posts','notes'] as $table) {
            if (!empty($new[$table])) { $isFullReset = false; }
        }

        // Historical integrity: records that orders point to may be archived but not deleted.
        $newOrders = $new['orders'] ?? [];
        $newProductIds = self::ids($new['products'] ?? []);
        $newCustomerIds = self::ids($new['customers'] ?? []);
        $referencedProducts = [];
        $referencedCustomers = [];
        foreach ($newOrders as $o) {
            foreach (self::orderProductIds($o) as $pid) { $referencedProducts[$pid] = true; }
            $referencedCustomers[self::name($o['customer'] ?? '')] = true;
        }
        if (!$isFullReset) {
            foreach ($old['products'] ?? [] as $p) {
                if (!isset($newProductIds[$p['id']]) && isset($referencedProducts[$p['id']])) {
                    return 'Product "'.($p['name'] ?? $p['id']).'" is used by existing orders and cannot be deleted. Archive it instead.';
                }
            }
            foreach ($old['customers'] ?? [] as $c) {
                if (!isset($newCustomerIds[$c['id']]) && isset($referencedCustomers[self::name($c['name'] ?? '')])) {
                    return 'Customer "'.($c['name'] ?? $c['id']).'" has existing orders and cannot be deleted. Archive them instead.';
                }
            }
            // Paid or refunded orders can never be deleted (financial history).
            $newOrderIds = self::ids($newOrders);
            foreach ($old['orders'] ?? [] as $o) {
                if (isset($newOrderIds[$o['id']])) { continue; }
                $hasMoney = (float)($o['paid'] ?? 0) > 0 || (float)($o['refunded'] ?? 0) > 0 || !empty($o['refundHistory']);
                if ($hasMoney) {
                    return 'Order '.$o['id'].' has recorded payments or refunds and cannot be deleted. Cancel it and record a refund instead.';
                }
            }
        }

        // New or edited orders may not use archived products/customers that they did not already use.
        $archivedProducts = [];
        foreach ($new['products'] ?? [] as $p) { if (($p['archived'] ?? false) === true) { $archivedProducts[$p['id']] = true; } }
        $archivedCustomers = [];
        foreach ($new['customers'] ?? [] as $c) { if (($c['archived'] ?? false) === true) { $archivedCustomers[self::name($c['name'] ?? '')] = true; } }
        $oldOrders = [];
        foreach ($old['orders'] ?? [] as $o) { $oldOrders[$o['id']] = $o; }
        foreach (self::changed($newOrders, $old['orders'] ?? []) as $o) {
            $before = $oldOrders[$o['id']] ?? null;
            $beforeProducts = $before ? array_flip(self::orderProductIds($before)) : [];
            foreach (self::orderProductIds($o) as $pid) {
                if (isset($archivedProducts[$pid]) && !isset($beforeProducts[$pid])) {
                    return 'An archived product cannot be added to an order. Restore it first.';
                }
            }
            $customer = self::name($o['customer'] ?? '');
            if ($customer !== '' && isset($archivedCustomers[$customer]) && (!$before || self::name($before['customer'] ?? '') !== $customer)) {
                return 'An archived customer cannot receive a new order. Restore them first.';
            }
        }
        return null;
    }

    /** Rows that are new or differ from the stored row with the same id. */
    private static function changed(array $newRows, array $oldRows): array
    {
        $old = [];
        foreach ($oldRows as $row) { if (is_array($row) && isset($row['id'])) { $old[$row['id']] = $row; } }
        $out = [];
        foreach ($newRows as $row) {
            if (!is_array($row) || !isset($row['id'])) { continue; }
            if (!isset($old[$row['id']]) || self::canon($old[$row['id']]) !== self::canon($row)) { $out[] = $row; }
        }
        return $out;
    }
    private static function canon(array $row): string { ksort($row); return json_encode($row, JSON_UNESCAPED_UNICODE | JSON_PARTIAL_OUTPUT_ON_ERROR) ?: ''; }
    private static function ids(array $rows): array { $o = []; foreach ($rows as $r) { if (isset($r['id'])) { $o[$r['id']] = true; } } return $o; }
    private static function name(mixed $v): string { return is_string($v) ? mb_strtolower(trim($v)) : ''; }
    /** @return string[] */
    private static function orderProductIds(array $order): array
    {
        $ids = [];
        if (!empty($order['items']) && is_array($order['items'])) {
            foreach ($order['items'] as $i) { if (isset($i['productId']) && is_string($i['productId'])) { $ids[] = $i['productId']; } }
        } elseif (isset($order['productId']) && is_string($order['productId']) && $order['productId'] !== '') {
            $ids[] = $order['productId'];
        }
        return array_values(array_unique($ids));
    }
}
