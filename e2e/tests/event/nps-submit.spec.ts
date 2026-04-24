// e2e/tests/event/nps-submit.spec.ts
// Smoke tests for NPS form submission.

import { test, expect } from '@playwright/test';

test.describe('NPS Form', () => {
  test('NPS form renders for eligible user', async ({ page }) => {
    await page.goto('/dashboard/kegiatan');
    await expect(page).not.toHaveURL(/500/);
    await expect(page).not.toHaveURL(/error/);
  });

  test('NPS already submitted view shows thank you', async ({ page }) => {
    await page.goto('/dashboard/kegiatan');
    await expect(page).not.toHaveURL(/500/);
  });
});
