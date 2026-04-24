// e2e/pulse-journal/journal-editor.spec.ts
// Verifies journal new entry page renders correctly.

import { test, expect } from '@playwright/test';

test.describe('Journal Editor', () => {
  test('redirects unauthenticated user from journal new page', async ({ page }) => {
    await page.goto('/dashboard/journal/new');
    await page.waitForLoadState('domcontentloaded');

    const url = page.url();
    const isRedirected =
      url.includes('/auth/login') ||
      url.includes('/api/auth/signin') ||
      url.includes('/pakta');

    const hasLoginInput = await page.locator('input[type="email"], input[type="password"]').count();

    expect(isRedirected || hasLoginInput > 0).toBeTruthy();
  });

  test('journal new page does not 500', async ({ page }) => {
    const response = await page.goto('/dashboard/journal/new');
    expect((response?.status() ?? 200)).toBeLessThan(500);
  });

  test('journal list page does not 500', async ({ page }) => {
    const response = await page.goto('/dashboard/journal');
    expect((response?.status() ?? 200)).toBeLessThan(500);
  });
});
