import { defineConfig } from '@playwright/test';
// NOT RUN in the authoring sandbox. Run against a LOCAL app + DISPOSABLE database only (see CODE_IMPROVEMENT_REPORTS/08_BROWSER_RETEST_HANDOFF.md).
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 0,
  use: { baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:8000', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
});
