// Field-level validation shared by every record form. Returns a map of field name -> message ('' map = valid).
import { EXPENSE_CATEGORIES, POST_PLATFORMS, POST_STATUSES } from './records';
export type FieldErrors = Record<string, string>;
export const isValidDate = (v: unknown): boolean => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v + 'T00:00:00Z');
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v && v >= '1900-01-01' && v <= '2100-12-31';
};
export const isValidMoney = (v: number): boolean => Number.isFinite(v) && v >= 0 && v <= 1000000000 && Math.abs(v * 100 - Math.round(v * 100)) < 0.001;
export const isValidEmail = (v: string): boolean => !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
export const isValidPhone = (v: string): boolean => !v.trim() || (/^\+?[\d\s().-]+$/.test(v.trim()) && v.replace(/\D/g, '').length >= 7 && v.replace(/\D/g, '').length <= 15);
const blank = (v: string | undefined) => !(v ?? '').trim();
const num = (v: string | undefined) => (v === undefined || v.trim() === '' ? NaN : Number(v));

export function validateProductForm(f: Record<string, string>, ctx: { skuTaken?: boolean; allocated?: number }): FieldErrors {
  const e: FieldErrors = {};
  if (blank(f.name)) e.name = 'Enter a product name.'; else if (f.name.trim().length > 120) e.name = 'Use 120 characters or fewer.';
  if (blank(f.sku)) e.sku = 'Enter a unique SKU.'; else if (f.sku.trim().length > 80) e.sku = 'Use 80 characters or fewer.';
  else if (ctx.skuTaken) e.sku = 'Another product (possibly archived) already uses this SKU.';
  if (blank(f.price)) e.price = 'Enter a selling price.'; else if (!isValidMoney(num(f.price))) e.price = 'Enter an amount of 0 or more with up to 2 decimals.';
  if (blank(f.cost)) e.cost = 'Enter a unit cost.'; else if (!isValidMoney(num(f.cost))) e.cost = 'Enter an amount of 0 or more with up to 2 decimals.';
  for (const k of ['stock', 'min']) {
    const label = k === 'stock' ? 'stock quantity' : 'restock threshold';
    if (blank(f[k])) e[k] = 'Enter a ' + label + ' (0 if none).';
    else if (!Number.isSafeInteger(num(f[k])) || num(f[k]) < 0 || num(f[k]) > 1000000000) e[k] = 'Use a whole number of 0 or more.';
  }
  if (!e.stock && ctx.allocated !== undefined && num(f.stock) < ctx.allocated) e.stock = 'Stock cannot be below the ' + ctx.allocated + ' already allocated to active orders.';
  return e;
}
export function validateCustomerForm(f: Record<string, string>, ctx: { nameTaken?: boolean }): FieldErrors {
  const e: FieldErrors = {};
  if (blank(f.name)) e.name = 'Enter the customer\'s name.'; else if (f.name.trim().length > 120) e.name = 'Use 120 characters or fewer.';
  else if (ctx.nameTaken) e.name = 'A customer with that name already exists (it may be archived).';
  if (!isValidEmail(f.email || '')) e.email = 'Enter a valid email address, e.g. name@example.com.';
  else if ((f.email || '').length > 254) e.email = 'Email is too long.';
  if (!isValidPhone(f.phone || '')) e.phone = 'Enter a valid phone number (7–15 digits).';
  for (const k of ['company', 'city', 'country']) if ((f[k] || '').length > 120) e[k] = 'Use 120 characters or fewer.';
  if ((f.address || '').length > 250) e.address = 'Use 250 characters or fewer.';
  if ((f.notes || '').length > 2000) e.notes = 'Use 2,000 characters or fewer.';
  return e;
}
export function validateExpenseForm(f: Record<string, string>): FieldErrors {
  const e: FieldErrors = {};
  if (blank(f.name)) e.name = 'Enter what the expense was for.'; else if (f.name.trim().length > 120) e.name = 'Use 120 characters or fewer.';
  if (blank(f.amount)) e.amount = 'Enter the amount.'; else if (!isValidMoney(num(f.amount)) || num(f.amount) <= 0) e.amount = 'Enter an amount above 0 with up to 2 decimals.';
  if (f.date && !isValidDate(f.date)) e.date = 'Enter a valid date (1900–2100).';
  if (f.category && !(EXPENSE_CATEGORIES as readonly string[]).includes(f.category)) e.category = 'Choose a category from the list.';
  return e;
}
export function validatePostForm(f: Record<string, string>): FieldErrors {
  const e: FieldErrors = {};
  if (!(POST_PLATFORMS as readonly string[]).includes(f.platform || '')) e.platform = 'Choose a platform.';
  if (blank(f.caption)) e.caption = 'Enter the content idea or caption.'; else if (f.caption.length > 2000) e.caption = 'Use 2,000 characters or fewer.';
  if (blank(f.date)) e.date = 'Choose a scheduled date.'; else if (!isValidDate(f.date)) e.date = 'Enter a valid date (1900–2100).';
  if (f.status && !(POST_STATUSES as readonly string[]).includes(f.status)) e.status = 'Choose a status.';
  return e;
}
export function validateNoteForm(f: Record<string, string>): FieldErrors {
  const e: FieldErrors = {};
  if (blank(f.title)) e.title = 'Enter a note title.'; else if (f.title.length > 120) e.title = 'Use 120 characters or fewer.';
  if (blank(f.body)) e.body = 'Write the note details.'; else if (f.body.length > 4000) e.body = 'Use 4,000 characters or fewer.';
  if (f.date && !isValidDate(f.date)) e.date = 'Enter a valid date (1900–2100).';
  return e;
}
export function validateOrderForm(f: Record<string, string>, ctx: { lineCount: number; customerArchived?: boolean }): FieldErrors {
  const e: FieldErrors = {};
  if (blank(f.customer)) e.customer = 'Enter the customer\'s name.'; else if (f.customer.trim().length > 120) e.customer = 'Use 120 characters or fewer.';
  else if (ctx.customerArchived) e.customer = 'This customer is archived. Restore them on the Customers page first.';
  if (ctx.lineCount === 0) e.products = 'Add at least one product to the order.';
  for (const k of ['shipping', 'tax']) if (f[k] !== undefined && f[k] !== '' && !isValidMoney(num(f[k]))) e[k] = 'Enter an amount of 0 or more with up to 2 decimals.';
  if (f.discount !== undefined && f.discount !== '' && !(num(f.discount) >= 0 && num(f.discount) <= 100)) e.discount = 'Enter a percentage from 0 to 100.';
  if (blank(f.paid)) e.paid = 'Enter the amount received (0 if unpaid).'; else if (!isValidMoney(num(f.paid))) e.paid = 'Enter an amount of 0 or more with up to 2 decimals.';
  if (f.scheduledDate && !isValidDate(f.scheduledDate)) e.scheduledDate = 'Enter a valid date (1900–2100).';
  if (f.status === 'Planned' && !f.scheduledDate) e.scheduledDate = 'Choose a scheduled date for a planned order.';
  return e;
}
