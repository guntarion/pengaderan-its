// e2e/anon-channel/m12-satgas-escalation.spec.ts
// M12 — Satgas escalation flow.
//
// NOTE: Full flow requires seeded users + HARASSMENT report fixture.
// Route protection tests run unconditionally.

import { test, expect } from '@playwright/test';

test.describe('M12 Satgas Escalation Flow', () => {
  test('Satgas escalated-reports page requires authentication', async ({ page }) => {
    await page.goto('/dashboard/satgas/escalated-reports');
    await page.waitForLoadState('domcontentloaded');

    const url = page.url();
    const isRedirectedToLogin =
      url.includes('/auth/login') ||
      url.includes('/api/auth/signin') ||
      url.includes('/login');

    const hasEmailInput = await page.locator('input[type="email"]').count();
    expect(isRedirectedToLogin || hasEmailInput > 0).toBeTruthy();
  });

  test('Satgas escalated detail page requires authentication', async ({ page }) => {
    await page.goto('/dashboard/satgas/escalated-reports/test-report-id');
    await page.waitForLoadState('domcontentloaded');

    const url = page.url();
    const isRedirectedToLogin =
      url.includes('/auth/login') ||
      url.includes('/api/auth/signin') ||
      url.includes('/login');

    const hasEmailInput = await page.locator('input[type="email"]').count();
    expect(isRedirectedToLogin || hasEmailInput > 0).toBeTruthy();
  });

  test('POST /api/anon-reports/id/escalate requires authentication', async ({ request }) => {
    const response = await request.post('/api/anon-reports/test-id/escalate');
    expect([401, 403]).toContain(response.status());
  });

  test('GET /api/anon-reports/id attachment requires authentication', async ({ request }) => {
    const response = await request.get('/api/anon-reports/test-id/attachment');
    expect([401, 403]).toContain(response.status());
  });

  // NOTE: Full escalation flow tests require seeded HARASSMENT report + BLM/Satgas users.
  // Uncomment when test environment is available.

  // test('HARASSMENT report is auto-escalated on submit', async ({ request }) => {
  //   const submitRes = await request.post('/api/anon-reports', {
  //     data: {
  //       cohortId: testCohortId,
  //       category: 'HARASSMENT',
  //       bodyText: 'Laporan pelecehan yang cukup panjang untuk minimum.',
  //       captchaToken: TEST_CAPTCHA_TOKEN,
  //     },
  //   });
  //   expect(submitRes.status()).toBe(201);
  //   const { trackingCode } = (await submitRes.json()).data;
  //
  //   // Wait for async escalation
  //   await page.waitForTimeout(2000);
  //
  //   // Satgas should see report in dashboard
  //   await loginAs(page, 'satgas-user@test.com');
  //   await page.goto('/dashboard/satgas/escalated-reports');
  //   await expect(page.getByText('NW-****' + trackingCode.slice(-4))).toBeVisible();
  // });
});
