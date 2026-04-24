// e2e/tests/event/cross-org-isolation.spec.ts
// Smoke tests for cross-org data isolation.

import { test, expect } from '@playwright/test';

test.describe('Cross-Org Isolation', () => {
  test('API returns 401/403/404 for unauthenticated cross-org request', async ({ page }) => {
    const response = await page.request.get('/api/event/instances/fake-id');
    expect([401, 403, 404]).toContain(response.status());
  });

  test('RSVP API requires authentication', async ({ page }) => {
    const response = await page.request.post('/api/event/rsvp', {
      data: { instanceId: 'fake-id' },
    });
    expect([401, 403]).toContain(response.status());
  });
});
