// e2e/tests/smoke/landing-page.spec.ts
// Smoke tests for the public landing page.

import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('loads successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/.+/);
  });

  test('has visible content', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Page should have a body with content
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('does not show error page', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(500);
  });
});
