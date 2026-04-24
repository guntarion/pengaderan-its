// e2e/mental-health/submit-flow.spec.ts
// M11 — PHQ-9 submission flow tests.
// NOTE: Full flow tests require seeded MABA user + consent record.
// These tests verify structural correctness and route availability.

import { test, expect } from '@playwright/test';

test.describe('M11 PHQ-9 Submit Flow', () => {
  test('Form page route does not 500', async ({ page }) => {
    const response = await page.goto('/dashboard/mental-health/form');
    expect((response?.status() ?? 200)).toBeLessThan(500);
  });

  test('Results page route does not 500', async ({ page }) => {
    const response = await page.goto('/dashboard/mental-health/results');
    expect((response?.status() ?? 200)).toBeLessThan(500);
  });

  test('Unauthenticated user cannot access form page', async ({ page }) => {
    await page.goto('/dashboard/mental-health/form');
    await page.waitForLoadState('domcontentloaded');

    const url = page.url();
    const isRedirected =
      url.includes('/auth/login') ||
      url.includes('/api/auth/signin') ||
      url.includes('/pakta') ||
      url.includes('/login');

    const hasLoginInput = await page.locator('input[type="email"], input[type="password"]').count();
    expect(isRedirected || hasLoginInput > 0).toBeTruthy();
  });

  // NOTE: The following tests require seeded MABA user + active consent record.
  // Uncomment and configure when test environment is available.

  // test('MABA can complete PHQ-9 form and see non-numeric result', async ({ page }) => {
  //   await page.goto('/dashboard/mental-health/form');
  //   // Fill 9 questions (all 0 = GREEN result)
  //   // ... navigate through each question and select answer
  //   await page.getByRole('button', { name: /submit/i }).click();
  //   // Result should NOT show raw numbers like "3" or "PHQ-9 Score: 5"
  //   await expect(page.getByText(/\d+\/27/i)).not.toBeVisible();
  //   // Should show category label
  //   await expect(page.getByText(/minimal|ringan|sedang|berat/i)).toBeVisible();
  // });

  // test('Item #9 > 0 shows emergency banner', async ({ page }) => {
  //   await page.goto('/dashboard/mental-health/form');
  //   // Navigate to item #9 and select value > 0
  //   // Submit
  //   await expect(page.getByText(/119/i)).toBeVisible(); // Emergency banner
  // });
});
