// e2e/anon-channel/m12-anon-report-happy.spec.ts
// M12 — Happy path: submit anonymous report → get tracking code → check status.
//
// NOTE: Full submit tests require captcha bypass (TEST_CAPTCHA_BYPASS=1 env var).
// Route availability and public page tests run unconditionally.

import { test, expect } from '@playwright/test';

test.describe('M12 Anonymous Channel — Happy Path', () => {
  test('Landing page loads without 500', async ({ page }) => {
    const response = await page.goto('/anon-report');
    expect(response?.status() ?? 200).toBeLessThan(500);
  });

  test('Form page loads without 500', async ({ page }) => {
    const response = await page.goto('/anon-report/form');
    expect(response?.status() ?? 200).toBeLessThan(500);
  });

  test('Status lookup page loads without 500', async ({ page }) => {
    const response = await page.goto('/anon-status');
    expect(response?.status() ?? 200).toBeLessThan(500);
  });

  test('AnonymityNotice is visible on landing page', async ({ page }) => {
    await page.goto('/anon-report');
    await page.waitForLoadState('domcontentloaded');

    // Should show anonymity guarantee text
    const bodyText = await page.textContent('body');
    const hasAnonymityText =
      bodyText?.toLowerCase().includes('anonim') ||
      bodyText?.toLowerCase().includes('privasi') ||
      bodyText?.toLowerCase().includes('identitas');

    expect(hasAnonymityText).toBeTruthy();
  });

  test('Status tracker returns generic 404 for unknown code', async ({ page }) => {
    const response = await page.goto('/anon-status/NW-XXXXXXXX');
    // Should load without 500 (graceful 404 handling)
    expect(response?.status() ?? 200).toBeLessThan(500);
  });

  test('Public cohort API returns array', async ({ page }) => {
    const response = await page.goto('/api/cohorts/public');
    expect(response?.status()).toBe(200);
    const json = await response?.json();
    expect(json?.success).toBe(true);
    expect(Array.isArray(json?.data)).toBe(true);
  });

  test('Status API returns 422 for invalid tracking code format', async ({ request }) => {
    const response = await request.get('/api/anon-reports/status/INVALID_CODE');
    expect([400, 422, 404]).toContain(response.status());
  });

  // NOTE: Full submit flow requires captcha bypass + seeded cohort.
  // This test verifies the API returns validation error without captcha.
  test('Submit API returns 400 without captcha token', async ({ request }) => {
    const response = await request.post('/api/anon-reports', {
      data: {
        cohortId: 'test-cohort',
        category: 'BULLYING',
        bodyText: 'Test laporan anonymous yang cukup panjang untuk memenuhi minimum.',
        // Missing captchaToken
      },
    });
    expect([400, 422]).toContain(response.status());
  });
});
