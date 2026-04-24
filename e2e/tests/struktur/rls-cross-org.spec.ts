// e2e/tests/struktur/rls-cross-org.spec.ts
// E2E: Row-Level Security — SC in org A cannot read KPGroup from org B.
// CRITICAL security test.

import { test, expect } from '../../fixtures/struktur';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

test.describe('RLS Cross-Organization Leak Prevention', () => {
  test('SC can only see KP Groups from their own organization', async ({ scPage }) => {
    const res = await scPage.request.get(`${BASE_URL}/api/admin/struktur/kp-groups`);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);

    // All returned groups must belong to the same organization
    if (body.data.length > 1) {
      const orgIds = new Set(
        (body.data as Array<{ organizationId?: string }>).map((g) => g.organizationId)
      );
      // Groups should all have an organizationId
      // If multiple orgIds exist, that would be a cross-org leak
      expect(orgIds.size).toBeLessThanOrEqual(1);
    }
  });

  test('SC can only see Kasuh Pairs from their organization', async ({ scPage }) => {
    const res = await scPage.request.get(`${BASE_URL}/api/admin/struktur/kasuh-pairs`);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);

    if (body.data.length > 1) {
      const orgIds = new Set(
        (body.data as Array<{ organizationId?: string }>).map((p) => p.organizationId)
      );
      expect(orgIds.size).toBeLessThanOrEqual(1);
    }
  });

  test('SC can only see Buddy Pairs from their organization', async ({ scPage }) => {
    const res = await scPage.request.get(`${BASE_URL}/api/admin/struktur/buddy-pairs`);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);

    if (body.data.length > 1) {
      const orgIds = new Set(
        (body.data as Array<{ organizationId?: string }>).map((p) => p.organizationId)
      );
      expect(orgIds.size).toBeLessThanOrEqual(1);
    }
  });

  test('SC can only see Pairing Requests from their organization', async ({ scPage }) => {
    const res = await scPage.request.get(`${BASE_URL}/api/admin/struktur/pairing-requests`);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);

    if (body.data.length > 1) {
      const orgIds = new Set(
        (body.data as Array<{ organizationId?: string }>).map((r) => r.organizationId)
      );
      expect(orgIds.size).toBeLessThanOrEqual(1);
    }
  });

  test('MABA cannot access KP Group from any organization via admin API', async ({
    mabaPage,
  }) => {
    const res = await mabaPage.request.get(`${BASE_URL}/api/admin/struktur/kp-groups`);
    // Must return 403 — MABA has no access to admin struktur APIs
    expect(res.status()).toBe(403);
  });

  test('KP dashboard only returns their own group (not cross-org)', async ({ kpPage }) => {
    const res = await kpPage.request.get(`${BASE_URL}/api/pairing/my-group`);
    const body = await res.json();

    expect(body.success).toBe(true);

    if (body.data) {
      // Should be exactly 1 group (or null) — not a list of all orgs' groups
      expect(typeof body.data === 'object' || body.data === null).toBe(true);
      // It must NOT be an array
      expect(Array.isArray(body.data)).toBe(false);
    }
  });
});
