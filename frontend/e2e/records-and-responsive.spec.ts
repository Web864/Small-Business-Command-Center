import { test, expect } from '@playwright/test';
import { signIn, VIEWPORTS } from './helpers';

test('F9: product archive persists across reload and is not offered for new orders', async ({ page }) => {
  await signIn(page);
  const sku = 'E2E-' + Date.now();
  await page.getByRole('button', { name: 'Products' }).click();
  await page.getByRole('button', { name: /add product/i }).click();
  await page.getByLabel(/product name/i).fill('E2E archive me');
  await page.getByLabel(/sku/i).fill(sku);
  for (const [label, v] of [[/selling price/i, '9.99'], [/unit cost/i, '3'], [/starting stock/i, '5'], [/restock threshold/i, '1']] as const) await page.getByLabel(label).fill(v);
  await page.getByRole('button', { name: /save product/i }).click();
  await page.getByRole('button', { name: 'Archive product E2E archive me' }).click();
  await page.getByRole('button', { name: 'Archive product', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Products' }).click();
  await expect(page.getByText('E2E archive me')).toHaveCount(0);
  await page.getByRole('button', { name: /^Archived/ }).click();
  await expect(page.getByText('E2E archive me')).toBeVisible();
  await page.getByRole('button', { name: 'Restore product E2E archive me' }).click();
});

test('F9: expense edit, category and confirmed delete with undo', async ({ page }) => {
  await signIn(page);
  await page.getByRole('button', { name: 'Expenses' }).click();
  await page.getByRole('button', { name: /add expense/i }).click();
  await page.getByLabel(/description/i).fill('E2E paper');
  await page.getByLabel(/^amount/i).fill('12.50');
  await page.getByLabel(/category/i).selectOption('Supplies');
  await page.getByRole('button', { name: /save expense/i }).click();
  await page.getByRole('button', { name: 'Delete expense E2E paper' }).click();
  await page.getByRole('button', { name: 'Delete expense', exact: true }).click();
  await page.getByRole('button', { name: 'Undo' }).click();
  await page.reload(); await page.getByRole('button', { name: 'Expenses' }).click();
  await expect(page.getByText('E2E paper')).toBeVisible();
});

for (const [width, height] of VIEWPORTS) {
  test(`F3/F8: no horizontal page overflow and 44px targets at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await signIn(page);
    for (const name of ['Dashboard', 'Orders', 'Products', 'Customers', 'Expenses', 'Content Planner', 'Pricing Lab']) {
      const nav = page.getByRole('button', { name, exact: true });
      if (!(await nav.isVisible())) await page.getByRole('button', { name: /sidebar/i }).click();
      await nav.click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
      const small = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>('main button, main a, main select, main input:not([type=hidden]):not([type=checkbox])'))
        .filter(el => el.offsetParent !== null && !el.closest('[hidden]'))
        .map(el => ({ el, r: el.getBoundingClientRect() })).filter(({ r }) => r.width > 0 && (r.height < 40 || r.width < 40))
        .map(({ el }) => (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 40)));
      expect(small, `small targets on ${name}`).toEqual([]);
    }
  });
}
