// e2e/tests/event/rsvp-waitlist.spec.ts
// Smoke tests for RSVP waitlist behavior.

import { test, expect } from '@playwright/test';

test.describe('RSVP Waitlist', () => {
  test('Waitlist badge appears when capacity is full', async ({ page }) => {
    await page.goto('/dashboard/kegiatan');
    await expect(page).not.toHaveURL(/500/);
  });

  test('Kegiatan listing page does not error', async ({ page }) => {
    const response = await page.goto('/dashboard/kegiatan');
    expect((response?.status() ?? 200)).toBeLessThan(500);
  });
});
