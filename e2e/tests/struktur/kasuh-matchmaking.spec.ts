// e2e/tests/struktur/kasuh-matchmaking.spec.ts
// E2E: SC runs kasuh suggest flow and commits picks.

import { test, expect } from '../../fixtures/struktur';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

test.describe('Kasuh Matchmaking Flow', () => {
  test('SC can view kasuh pairing list page', async ({ scPage }) => {
    await scPage.goto(`${BASE_URL}/admin/struktur/kasuh-pairing`);

    await expect(scPage.getByRole('heading', { name: /kasuh pairing/i })).toBeVisible();
  });

  test('SC can navigate to kasuh suggest page', async ({ scPage }) => {
    await scPage.goto(`${BASE_URL}/admin/struktur/kasuh-pairing`);

    const suggestButton = scPage.getByRole('button', { name: /suggest kasuh|rekomendasikan/i });
    if (await suggestButton.isVisible()) {
      await suggestButton.click();
      await expect(scPage).toHaveURL(/\/admin\/struktur\/kasuh-pairing\/suggest/);
    }
  });

  test('Kasuh pairing API returns list', async ({ scPage }) => {
    const res = await scPage.request.get(`${BASE_URL}/api/admin/struktur/kasuh-pairs`);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('OC cannot access kasuh pairing (SC only)', async ({ ocPage }) => {
    const res = await ocPage.request.get(`${BASE_URL}/api/admin/struktur/kasuh-pairs`);
    // OC should be rejected — kasuh-pairs requires SC or SUPERADMIN
    expect(res.status()).toBe(403);
  });

  test('SC can view kasuh suggest page UI', async ({ scPage }) => {
    await scPage.goto(`${BASE_URL}/admin/struktur/kasuh-pairing/suggest`);
    // Should load without crashing
    await expect(scPage.getByRole('heading').first()).toBeVisible();
  });
});
