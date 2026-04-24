// e2e/pulse-journal/kp-cross-group-forbidden.spec.ts
// Verifies that journal API returns 401/403 when accessed without auth.

import { test, expect } from '@playwright/test';

test.describe('KP Cross-Group Access Control', () => {
  test('GET /api/journal/unscored returns 401 without auth', async ({ request }) => {
    const response = await request.get('/api/journal/unscored');
    expect(response.status()).toBe(401);
  });

  test('GET /api/journal/by-id/:id returns 401 without auth', async ({ request }) => {
    const response = await request.get('/api/journal/by-id/non-existent-id');
    expect(response.status()).toBe(401);
  });

  test('GET /api/kp/mood returns 401 without auth', async ({ request }) => {
    const response = await request.get('/api/kp/mood?cohortId=x&kpGroupId=y');
    expect(response.status()).toBe(401);
  });

  test('GET /api/kp/red-flag returns 401 without auth', async ({ request }) => {
    const response = await request.get('/api/kp/red-flag?cohortId=x');
    expect(response.status()).toBe(401);
  });

  test('journal detail page redirects unauthenticated user', async ({ page }) => {
    await page.goto('/dashboard/kp/journal-review/non-existent-id');
    await page.waitForLoadState('domcontentloaded');

    const url = page.url();
    const isRedirected =
      url.includes('/auth/login') ||
      url.includes('/api/auth/signin') ||
      url.includes('/pakta');

    const hasLoginInput = await page.locator('input[type="email"], input[type="password"]').count();

    expect(isRedirected || hasLoginInput > 0).toBeTruthy();
  });
});
