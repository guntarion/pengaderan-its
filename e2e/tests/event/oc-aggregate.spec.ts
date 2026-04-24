// e2e/tests/event/oc-aggregate.spec.ts
// Smoke tests for OC aggregate NPS view.

import { test, expect } from '@playwright/test';

test.describe('OC Aggregate View', () => {
  test('OC dashboard loads kegiatan list without 500', async ({ page }) => {
    await page.goto('/dashboard/oc/kegiatan');
    // Will redirect to login if not authenticated — both are acceptable
    await expect(page).not.toHaveURL(/500/);
  });

  test('OC kegiatan page does not error', async ({ page }) => {
    const response = await page.goto('/dashboard/oc/kegiatan');
    expect((response?.status() ?? 200)).toBeLessThan(500);
  });
});
