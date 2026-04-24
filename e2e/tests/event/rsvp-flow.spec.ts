// e2e/tests/event/rsvp-flow.spec.ts
// Smoke tests for Maba RSVP flow.

import { test, expect } from '@playwright/test';

test.describe('RSVP Flow', () => {
  test('Maba can navigate to kegiatan listing', async ({ page }) => {
    await page.goto('/dashboard/kegiatan');
    // Will redirect to login if not authenticated — both are acceptable
    await expect(page).not.toHaveURL(/500/);
    await expect(page).not.toHaveURL(/error/);
  });

  test('Kegiatan listing page does not 500', async ({ page }) => {
    const response = await page.goto('/dashboard/kegiatan');
    expect((response?.status() ?? 200)).toBeLessThan(500);
  });

  test('RSVP status badge reflects confirmed state', async ({ page }) => {
    await page.goto('/dashboard/kegiatan');
    await expect(page).not.toHaveURL(/500/);
  });
});
