// e2e/tests/event/public-catalog-instance.spec.ts
// Smoke tests for public instance catalog page (no auth required).

import { test, expect } from '@playwright/test';

test.describe('Public Instance Catalog', () => {
  test('Public kegiatan catalog page is accessible without auth', async ({ page }) => {
    await page.goto('/kegiatan');
    await expect(page).not.toHaveURL(/500/);
    await expect(page).not.toHaveURL(/error/);
  });

  test('Public kegiatan catalog does not return 500', async ({ page }) => {
    const response = await page.goto('/kegiatan');
    expect((response?.status() ?? 200)).toBeLessThan(500);
  });
});
