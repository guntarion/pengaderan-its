// e2e/pulse-journal/journal-submit-lock.spec.ts
// Verifies journal week view page handles authentication properly.

import { test, expect } from '@playwright/test';

test.describe('Journal Submit Lock', () => {
  test('journal weekNumber page redirects unauthenticated user', async ({ page }) => {
    await page.goto('/dashboard/journal/1');
    await page.waitForLoadState('domcontentloaded');

    const url = page.url();
    const isRedirected =
      url.includes('/auth/login') ||
      url.includes('/api/auth/signin') ||
      url.includes('/pakta');

    const hasLoginInput = await page.locator('input[type="email"], input[type="password"]').count();

    expect(isRedirected || hasLoginInput > 0).toBeTruthy();
  });

  test('journal week page does not 500', async ({ page }) => {
    const response = await page.goto('/dashboard/journal/1');
    expect((response?.status() ?? 200)).toBeLessThan(500);
  });
});
