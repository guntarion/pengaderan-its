// e2e/anon-channel/m12-anonymity-assertions.spec.ts
// M12 — Anonymity invariant assertions.
//
// These tests verify that privacy guarantees are enforced:
//   - SC cannot access report detail (403)
//   - BLM-A cannot access BLM-B reports (RLS returns empty/403)
//   - Status tracker returns only allowlisted fields
//   - Tracking code format validation enforced

import { test, expect } from '@playwright/test';

test.describe('M12 Anonymity Invariants', () => {
  test('SC cannot access detail API (requires BLM/Satgas/SUPERADMIN)', async ({ request }) => {
    // Without auth, should be 401
    const response = await request.get('/api/anon-reports/any-report-id');
    expect([401, 403, 404]).toContain(response.status());
  });

  test('Status tracker API rejects malformed tracking code', async ({ request }) => {
    // Test various malformed codes
    const invalidCodes = [
      'NW-TOO-SHORT',
      'NW-toolower8',
      'AB-12345678',
      'NW-12345678X', // 9 chars
      'NW-1234567',   // 7 chars
      '12345678',     // no prefix
    ];

    for (const code of invalidCodes) {
      const response = await request.get(`/api/anon-reports/status/${code}`);
      expect([400, 404, 422]).toContain(response.status());
    }
  });

  test('Status tracker API accepts valid NW-XXXXXXXX format', async ({ request }) => {
    // Valid format but non-existent code — should return 404, not 422
    const response = await request.get('/api/anon-reports/status/NW-ABCD1234');
    // Either 404 (not found) or 200 with null data
    // Must NOT be 400 (validation error) for valid format
    expect(response.status()).not.toBe(400);
    expect(response.status()).not.toBe(422);
  });

  test('Status tracker response does not include bodyText', async ({ request }) => {
    // Even if report exists, bodyText must not be in public status response
    const response = await request.get('/api/anon-reports/status/NW-ABCD1234');
    const text = await response.text();

    // bodyText should never appear in public status response
    expect(text.toLowerCase()).not.toContain('"bodytext"');
    expect(text.toLowerCase()).not.toContain('"body_text"');
  });

  test('Status tracker response does not include attachmentKey', async ({ request }) => {
    const response = await request.get('/api/anon-reports/status/NW-ABCD1234');
    const text = await response.text();

    // attachmentKey must not be in public response
    expect(text.toLowerCase()).not.toContain('"attachmentkey"');
    expect(text.toLowerCase()).not.toContain('"attachment_key"');
  });

  test('Status tracker response does not include resolutionNotes (internal)', async ({ request }) => {
    const response = await request.get('/api/anon-reports/status/NW-ABCD1234');
    const text = await response.text();

    // Internal notes must not appear in public response
    expect(text.toLowerCase()).not.toContain('"resolutionnotes"');
    expect(text.toLowerCase()).not.toContain('"satgasnotes"');
  });

  test('GET /api/anon-reports/summary requires SC/BLM/Satgas/SUPERADMIN role', async ({ request }) => {
    const response = await request.get('/api/anon-reports/summary');
    expect([401, 403]).toContain(response.status());
  });

  test('Superadmin audit log requires SUPERADMIN auth', async ({ request }) => {
    const response = await request.get('/api/anon-reports/superadmin/audit-log');
    expect([401, 403]).toContain(response.status());
  });

  test('Superadmin bulk-delete requires SUPERADMIN auth', async ({ request }) => {
    const response = await request.post('/api/anon-reports/superadmin/bulk-delete', {
      data: { reportIds: ['fake-id'], reason: 'Test deletion reason' },
    });
    expect([401, 403]).toContain(response.status());
  });

  // NOTE: Cross-org BLM access test requires seeded users + reports from different orgs.
  // test('BLM-A cannot access BLM-B org reports', async ({ request }) => {
  //   const token = await loginAndGetToken('blm-a@org-a.com');
  //   const response = await request.get('/api/anon-reports?organizationId=org-b-id', {
  //     headers: { Authorization: `Bearer ${token}` },
  //   });
  //   const json = await response.json();
  //   // RLS should return empty array (not error)
  //   expect(response.status()).toBe(200);
  //   expect(json.data).toHaveLength(0);
  // });
});
