// Record-management helpers shared by the UI and the unit tests. All functions are pure and never mutate their arguments.
export const EXPENSE_CATEGORIES = ['Supplies', 'Shipping', 'Marketing', 'Software', 'Rent', 'Utilities', 'Other'] as const;
export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];
export const POST_PLATFORMS = ['Instagram', 'Pinterest', 'TikTok', 'Facebook'] as const;
export const POST_STATUSES = ['Draft', 'Planned', 'Posted'] as const;

type WithId = { id: string };
export type ArchivableProduct = WithId & { name: string; sku: string; archived?: boolean };
export type ArchivableCustomer = WithId & { name: string; archived?: boolean; email?: string; phone?: string; company?: string; address?: string; city?: string; country?: string; notes?: string };
export type OrderRef = { id: string; customer: string; productId: string; items?: Array<{ productId: string }> };

export const isArchived = (record: { archived?: boolean } | undefined | null): boolean => record?.archived === true;
export const activeOnly = <T extends { archived?: boolean }>(records: T[]): T[] => records.filter(r => !isArchived(r));
export const archivedOnly = <T extends { archived?: boolean }>(records: T[]): T[] => records.filter(isArchived);

/** Reversible archive: the record stays in the array (so order history keeps resolving it). */
export function setArchived<T extends WithId & { archived?: boolean }>(records: T[], id: string, archived: boolean): T[] {
  return records.map(r => {
    if (r.id !== id) return r;
    if (archived) return { ...r, archived: true };
    const { archived: _drop, ...rest } = r as T & { archived?: boolean };
    return rest as T;
  });
}
/** Archive/restore a customer by id; customers that only exist because an order names them (auto-…) are materialised first. */
export function setCustomerArchived<T extends ArchivableCustomer>(stored: T[], target: T, archived: boolean): T[] {
  const exists = stored.some(c => c.id === target.id);
  if (exists) return setArchived(stored, target.id, archived);
  const id = target.id.startsWith('auto-') ? 'c' + target.id.slice(5).replace(/[^a-z0-9]+/gi, '-') : target.id;
  const created = { ...target, id } as T;
  return setArchived([...stored, created], id, archived);
}
export const productIdsOf = (order: OrderRef): string[] => {
  const ids = (order.items?.length ? order.items.map(i => i.productId) : [order.productId]).filter(Boolean);
  return Array.from(new Set(ids));
};
export const productHasHistory = (productId: string, orders: OrderRef[]): boolean => orders.some(o => productIdsOf(o).includes(productId));
export const customerHasHistory = (name: string, orders: OrderRef[]): boolean =>
  orders.some(o => o.customer.trim().toLowerCase() === name.trim().toLowerCase());

/** Names a user may pick for a NEW order: archived customers are excluded. */
export function selectableCustomerNames(stored: ArchivableCustomer[], orders: OrderRef[]): string[] {
  const archived = new Set(stored.filter(isArchived).map(c => c.name.trim().toLowerCase()));
  const names = new Map<string, string>();
  stored.filter(c => !isArchived(c)).forEach(c => names.set(c.name.trim().toLowerCase(), c.name));
  orders.forEach(o => { const key = o.customer.trim().toLowerCase(); if (key && !archived.has(key) && !names.has(key)) names.set(key, o.customer); });
  return Array.from(names.values());
}
export const removeById = <T extends WithId>(records: T[], id: string): T[] => records.filter(r => r.id !== id);

export const plural = (n: number, singular: string, pluralForm?: string): string =>
  n + ' ' + (n === 1 ? singular : (pluralForm ?? singular + 's'));
export const normalizeCategory = (value: unknown): string => (typeof value === 'string' && (EXPENSE_CATEGORIES as readonly string[]).includes(value) ? value : '');
export const expenseCategoryLabel = (value: unknown): string => normalizeCategory(value) || 'Uncategorised';

/** Greeting name: display name, else a real account name, else a neutral fallback — never the raw email address. */
export function greetingName(displayName: string | undefined, accountName: string | undefined, email: string | undefined): string {
  const display = (displayName ?? '').trim();
  if (display) return display;
  const account = (accountName ?? '').trim();
  if (account && account.toLowerCase() !== (email ?? '').trim().toLowerCase() && !account.includes('@')) return account;
  return 'there';
}
/** Sum of non-archived/non-deleted expenses by category (uncategorised kept separate). */
export function expenseTotalsByCategory(expenses: Array<{ amount: number; category?: string }>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of expenses) { const key = expenseCategoryLabel(e.category); out[key] = Math.round(((out[key] || 0) + e.amount) * 100) / 100; }
  return out;
}
