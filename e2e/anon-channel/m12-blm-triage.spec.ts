// e2e/anon-channel/m12-blm-triage.spec.ts
// M12 — BLM triage flow: login → view list → detail → acknowledge → add note → resolve.
//
// NOTE: Full flow requires seeded BLM user + AnonReport fixture.
// Route protection and structural tests run unconditionally.

import { test, expect } from '@playwright/test';

test.describe('M12 BLM Triage Dashboard', () => {
  test('BLM anon-reports list page requires authentication', async ({ page }) => {
    await page.goto('/dashboard/blm/anon-reports');
    await page.waitForLoadState('domcontentloaded');

    const url = page.url();
    const isRedirectedToLogin =
      url.includes('/auth/login') ||
      url.includes('/api/auth/signin') ||
      url.includes('/login');

    // Should either redirect to login or show auth-related UI
    const hasEmailInput = await page.locator('input[type="email"]').count();
    expect(isRedirectedToLogin || hasEmailInput > 0).toBeTruthy();
  });

  test('BLM report detail page requires authentication', async ({ page }) => {
    await page.goto('/dashboard/blm/anon-reports/test-report-id');
    await page.waitForLoadState('domcontentloaded');

    const url = page.url();
    const isRedirectedToLogin =
      url.includes('/auth/login') ||
      url.includes('/api/auth/signin') ||
      url.includes('/login');

    const hasEmailInput = await page.locator('input[type="email"]').count();
    expect(isRedirectedToLogin || hasEmailInput > 0).toBeTruthy();
  });

  test('GET /api/anon-reports requires authentication', async ({ request }) => {
    const response = await request.get('/api/anon-reports');
    expect([401, 403]).toContain(response.status());
  });

  test('POST /api/anon-reports/id/acknowledge requires authentication', async ({ request }) => {
    const response = await request.post('/api/anon-reports/test-id/acknowledge');
    expect([401, 403]).toContain(response.status());
  });

  test('POST /api/anon-reports/id/resolve requires authentication', async ({ request }) => {
    const response = await request.post('/api/anon-reports/test-id/resolve', {
      data: { resolutionNotes: 'Test resolution note' },
    });
    expect([401, 403]).toContain(response.status());
  });

  test('POST /api/anon-reports/id/notes requires authentication', async ({ request }) => {
    const response = await request.post('/api/anon-reports/test-id/notes', {
      data: { type: 'internal', content: 'Test note' },
    });
    expect([401, 403]).toContain(response.status());
  });

  // NOTE: Full BLM triage flow tests below require seeded data.
  // Uncomment when test environment is available.

  // test('BLM can see anon reports list for their org', async ({ page }) => {
  //   await loginAs(page, 'blm-user@test.com');
  //   await page.goto('/dashboard/blm/anon-reports');
  //   await expect(page.locator('[data-testid="report-table"]')).toBeVisible();
  // });

  // test('BLM can acknowledge report (NEW → IN_REVIEW)', async ({ page }) => {
  //   await loginAs(page, 'blm-user@test.com');
  //   await page.goto(`/dashboard/blm/anon-reports/${seedReportId}`);
  //   await page.click('[data-testid="btn-acknowledge"]');
  //   await page.click('[data-testid="confirm-dialog-ok"]');
  //   await expect(page.getByText('IN_REVIEW')).toBeVisible();
  // });
});
