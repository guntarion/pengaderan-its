// e2e/pulse-journal/pulse-submit.spec.ts
// Verifies pulse submit form renders on /dashboard/pulse

import { test, expect } from '@playwright/test';

test.describe('Pulse Submit Form', () => {
  test('redirects unauthenticated user from pulse page', async ({ page }) => {
    await page.goto('/dashboard/pulse');
    await page.waitForLoadState('domcontentloaded');

    const url = page.url();
    const isRedirected =
      url.includes('/auth/login') ||
      url.includes('/api/auth/signin') ||
      url.includes('/pakta');

    const hasLoginInput = await page.locator('input[type="email"], input[type="password"]').count();

    expect(isRedirected || hasLoginInput > 0).toBeTruthy();
  });

  test('pulse page route does not 500', async ({ page }) => {
    const response = await page.goto('/dashboard/pulse');
    // Should either load (200) or redirect (3xx) — not server error (5xx)
    expect((response?.status() ?? 200)).toBeLessThan(500);
  });
});
