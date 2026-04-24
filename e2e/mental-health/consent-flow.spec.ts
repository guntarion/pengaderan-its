// e2e/mental-health/consent-flow.spec.ts
// M11 — Consent flow tests.
// NOTE: These tests require a real DB + MABA user session. They are structural tests
// designed to be run in a seeded test environment.

import { test, expect } from '@playwright/test';

test.describe('M11 Consent Flow', () => {
  test('MABA can access consent page (unauthenticated redirects)', async ({ page }) => {
    // Without auth, should redirect to login
    await page.goto('/dashboard/mental-health/consent');
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

  test('Consent page route does not 500', async ({ page }) => {
    const response = await page.goto('/dashboard/mental-health/consent');
    // Should either load (200) or redirect (3xx) — not 5xx
    expect((response?.status() ?? 200)).toBeLessThan(500);
  });

  test('Privacy controls page does not 500', async ({ page }) => {
    const response = await page.goto('/dashboard/mental-health/privacy');
    expect((response?.status() ?? 200)).toBeLessThan(500);
  });

  // NOTE: The following tests require a seeded MABA user session.
  // Uncomment and configure auth fixture when test environment is available.

  // test('MABA can accept consent and proceed to form', async ({ page }) => {
  //   // Login as MABA user (use existing auth fixture or create one)
  //   await page.goto('/dashboard/mental-health/consent');
  //   await expect(page.getByText('Persetujuan')).toBeVisible();
  //   // Check the checkbox
  //   await page.getByRole('checkbox').check();
  //   // Click Mulai
  //   await page.getByRole('button', { name: /mulai/i }).click();
  //   // Should redirect or show form
  //   await expect(page.url()).toContain('mental-health');
  // });

  // test('MABA can decline consent and return to dashboard', async ({ page }) => {
  //   await page.goto('/dashboard/mental-health/consent');
  //   await page.getByRole('button', { name: /tidak sekarang/i }).click();
  //   await expect(page.url()).toContain('dashboard');
  // });
});
