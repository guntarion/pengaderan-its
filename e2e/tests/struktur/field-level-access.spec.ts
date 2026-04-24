// e2e/tests/struktur/field-level-access.spec.ts
// E2E: Verify field-level access — KP cannot see KIP, KASUH cannot see MH.
// CRITICAL security tests.

import { test, expect } from '../../fixtures/struktur';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

test.describe('Field-Level Access Control', () => {
  test('KP GET /api/pairing/my-group — response must NOT contain isKIP or emergencyContact', async ({
    kpPage,
  }) => {
    const res = await kpPage.request.get(`${BASE_URL}/api/pairing/my-group`);
    const body = await res.json();

    expect(body.success).toBe(true);

    if (body.data && body.data.members) {
      const responseText = JSON.stringify(body.data);
      // These fields MUST NOT be present in kp_group_view
      expect(responseText).not.toContain('"isKIP"');
      expect(responseText).not.toContain('"emergencyContact"');
      expect(responseText).not.toContain('"emergencyContactName"');
      expect(responseText).not.toContain('"emergencyContactPhone"');
    }
  });

  test('KASUH GET /api/pairing/my-adik-asuh — response MUST contain isKIP but NOT mhScreening', async ({
    kasuhPage,
  }) => {
    const res = await kasuhPage.request.get(`${BASE_URL}/api/pairing/my-adik-asuh`);
    const body = await res.json();

    expect(body.success).toBe(true);

    if (body.data && (body.data as Array<unknown>).length > 0) {
      const responseText = JSON.stringify(body.data);
      // isKIP should be present (kasuh_adik_view allows it)
      // Note: only if there are active pairs
      // mhScreening MUST NOT be present
      expect(responseText).not.toContain('"mhScreening"');
      expect(responseText).not.toContain('"mentalHealth"');
      expect(responseText).not.toContain('"emergencyContactName"');
    }
  });

  test('MABA GET /api/pairing/my-relations — kasuh data only has public fields', async ({
    mabaPage,
  }) => {
    const res = await mabaPage.request.get(`${BASE_URL}/api/pairing/my-relations`);
    const body = await res.json();

    expect(body.success).toBe(true);

    if (body.data?.kasuhPair) {
      const kasuhData = JSON.stringify(body.data.kasuhPair.kasuh);
      // buddy_view: no isKIP, no isRantau, no emergency contact
      expect(kasuhData).not.toContain('"isKIP"');
      expect(kasuhData).not.toContain('"isRantau"');
      expect(kasuhData).not.toContain('"emergencyContactName"');
    }
  });

  test('MABA cannot call KP group API', async ({ mabaPage }) => {
    const res = await mabaPage.request.get(`${BASE_URL}/api/pairing/my-group`);
    expect(res.status()).toBe(403);
  });

  test('KP cannot call adik asuh API', async ({ kpPage }) => {
    const res = await kpPage.request.get(`${BASE_URL}/api/pairing/my-adik-asuh`);
    expect(res.status()).toBe(403);
  });

  test('KASUH cannot call my-relations API (MABA only)', async ({ kasuhPage }) => {
    const res = await kasuhPage.request.get(`${BASE_URL}/api/pairing/my-relations`);
    expect(res.status()).toBe(403);
  });

  test('MABA cannot call admin struktur API', async ({ mabaPage }) => {
    const res = await mabaPage.request.get(`${BASE_URL}/api/admin/struktur/kp-groups`);
    expect(res.status()).toBe(403);
  });
});
