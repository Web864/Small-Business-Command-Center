import { test, expect } from '@playwright/test';
import { signIn } from './helpers';

test.beforeEach(async ({ page }) => { await signIn(page); });

test('F2: skip link, landmarks, aria-current and document titles', async ({ page }) => {
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
  await page.getByRole('button', { name: 'Orders' }).click();
  await expect(page.getByRole('button', { name: 'Orders' })).toHaveAttribute('aria-current', 'page');
  await expect(page).toHaveTitle(/Orders/);
});

test('F1: add-product dialog traps focus, closes with Escape, restores focus, warns about unsaved data', async ({ page }) => {
  await page.getByRole('button', { name: 'Products' }).click();
  const opener = page.getByRole('button', { name: /add product/i });
  await opener.focus(); await opener.press('Enter');
  const dialog = page.getByRole('dialog', { name: /add product/i });
  await expect(dialog).toBeVisible();
  await expect(page.locator('main')).toHaveAttribute('inert', '');
  for (let i = 0; i < 25; i++) { await page.keyboard.press('Tab'); expect(await dialog.evaluate(d => d.contains(document.activeElement))).toBe(true); }
  await page.getByLabel(/product name/i).fill('Unsaved item');
  await page.keyboard.press('Escape');
  const confirm = page.getByRole('alertdialog', { name: /discard unsaved changes/i });
  await expect(confirm).toBeVisible();
  await page.mouse.click(5, 5);                       // backdrop must NOT dismiss a destructive confirm
  await expect(confirm).toBeVisible();
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Discard changes' }).click();
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test('F4: field-level errors, aria-invalid and duplicate SKU message', async ({ page }) => {
  await page.getByRole('button', { name: 'Products' }).click();
  await page.getByRole('button', { name: /add product/i }).click();
  await page.getByRole('button', { name: /save product/i }).click();
  await expect(page.getByLabel(/product name/i)).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#record-name-error')).toBeVisible();
  await expect(page.getByRole('dialog')).toBeVisible();           // data and dialog preserved on error
});
