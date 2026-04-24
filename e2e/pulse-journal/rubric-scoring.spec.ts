// e2e/pulse-journal/rubric-scoring.spec.ts
// Verifies KP journal-review page is accessible only with proper auth.

import { test, expect } from '@playwright/test';

test.describe('Rubric Scoring — KP Journal Review', () => {
  test('kp journal-review redirects unauthenticated user', async ({ page }) => {
    await page.goto('/dashboard/kp/journal-review');
    await page.waitForLoadState('domcontentloaded');

    const url = page.url();
    const isRedirected =
      url.includes('/auth/login') ||
      url.includes('/api/auth/signin') ||
      url.includes('/pakta');

    const hasLoginInput = await page.locator('input[type="email"], input[type="password"]').count();

    expect(isRedirected || hasLoginInput > 0).toBeTruthy();
  });

  test('kp journal-review page does not 500', async ({ page }) => {
    const response = await page.goto('/dashboard/kp/journal-review');
    expect((response?.status() ?? 200)).toBeLessThan(500);
  });
});
