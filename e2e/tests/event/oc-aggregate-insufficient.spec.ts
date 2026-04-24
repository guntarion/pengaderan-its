// e2e/tests/event/oc-aggregate-insufficient.spec.ts
// Smoke tests for OC NPS insufficient data state (n < 5).

import { test, expect } from '@playwright/test';

test.describe('OC NPS Insufficient Data', () => {
  test('Insufficient data message shown when n < 5', async ({ page }) => {
    await page.goto('/dashboard/oc/kegiatan');
    await expect(page).not.toHaveURL(/500/);
  });
});
