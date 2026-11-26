import { expect, type Page } from '@playwright/test';
/** Synthetic accounts come from the environment — never hard-code credentials. */
export const account = () => {
  const email = process.env.E2E_EMAIL, password = process.env.E2E_PASSWORD;
  if (!email || !password) throw new Error('Set E2E_EMAIL and E2E_PASSWORD to a synthetic licensed account on a disposable database.');
  return { email, password };
};
export async function signIn(page: Page) {
  const { email, password } = account();
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await expect(page.getByRole('navigation', { name: /workspace/i })).toBeVisible();
}
export const VIEWPORTS = [[320, 700], [375, 812], [430, 932], [768, 1024], [1024, 768], [1366, 768], [1920, 1080]] as const;
