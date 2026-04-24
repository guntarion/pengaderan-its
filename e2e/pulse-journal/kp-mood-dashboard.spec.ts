// e2e/pulse-journal/kp-mood-dashboard.spec.ts
// Verifies KP mood dashboard page is accessible only with proper auth.

import { test, expect } from '@playwright/test';

test.describe('KP Mood Dashboard', () => {
  test('kp mood page redirects unauthenticated user', async ({ page }) => {
    await page.goto('/dashboard/kp/mood');
    await page.waitForLoadState('domcontentloaded');

    const url = page.url();
    const isRedirected =
      url.includes('/auth/login') ||
      url.includes('/api/auth/signin') ||
      url.includes('/pakta');

    const hasLoginInput = await page.locator('input[type="email"], input[type="password"]').count();

    expect(isRedirected || hasLoginInput > 0).toBeTruthy();
  });

  test('kp mood page does not 500', async ({ page }) => {
    const response = await page.goto('/dashboard/kp/mood');
    expect((response?.status() ?? 200)).toBeLessThan(500);
  });
});
