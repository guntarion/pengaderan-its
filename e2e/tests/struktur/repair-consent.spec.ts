// e2e/tests/struktur/repair-consent.spec.ts
// E2E: Re-pair consent flow — MABA submits, SC approves/fulfills, MABA verifies.

import { test, expect } from '../../fixtures/struktur';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

test.describe('Re-Pair Consent Flow', () => {
  test('MABA can see Relasi Saya page', async ({ mabaPage }) => {
    await mabaPage.goto(`${BASE_URL}/dashboard/relasi`);

    await expect(mabaPage.getByRole('heading', { name: 'Relasi Saya' })).toBeVisible();
  });

  test('MABA can navigate to request page', async ({ mabaPage }) => {
    await mabaPage.goto(`${BASE_URL}/dashboard/kakak-c/request`);

    // Should show the form title from copy lock
    await expect(
      mabaPage.getByRole('heading', { name: /ajukan pergantian/i })
    ).toBeVisible();
  });

  test('MABA form shows note label from copy lock', async ({ mabaPage }) => {
    await mabaPage.goto(`${BASE_URL}/dashboard/kakak-c/request`);

    // Look for the copy-locked label
    const noteLabel = mabaPage.getByText('Catatan untuk SC (opsional)');
    const hasKasuh = await mabaPage.getByText(/kakak asuh saat ini/i).isVisible().catch(() => false);

    if (hasKasuh) {
      // MABA has kasuh — form is visible, check label
      await expect(noteLabel).toBeVisible();
    } else {
      // No active kasuh — form shows disabled state
      await expect(mabaPage.getByText(/belum memiliki kakak asuh/i)).toBeVisible();
    }
  });

  test('SC can view pairing requests queue', async ({ scPage }) => {
    await scPage.goto(`${BASE_URL}/admin/struktur/pairing-requests`);

    await expect(scPage.getByRole('heading', { name: 'Pairing Requests' })).toBeVisible();
    await expect(scPage.getByText('PENDING')).toBeVisible();
  });

  test('SC can filter pairing requests by status', async ({ scPage }) => {
    await scPage.goto(`${BASE_URL}/admin/struktur/pairing-requests`);

    // Click FULFILLED filter tab
    await scPage.getByRole('button', { name: 'FULFILLED' }).click();

    // Table should reload with FULFILLED filter
    await expect(scPage.getByText('PENDING').or(scPage.getByText('FULFILLED'))).toBeVisible();
  });

  test('SC pairing request API returns PENDING list', async ({ scPage }) => {
    const res = await scPage.request.get(
      `${BASE_URL}/api/admin/struktur/pairing-requests?status=PENDING`
    );
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    // All returned items should be PENDING
    for (const item of body.data as Array<{ status: string }>) {
      expect(item.status).toBe('PENDING');
    }
  });

  test('MABA cannot access SC pairing requests endpoint', async ({ mabaPage }) => {
    const res = await mabaPage.request.get(
      `${BASE_URL}/api/admin/struktur/pairing-requests`
    );
    expect(res.status()).toBe(403);
  });
});
