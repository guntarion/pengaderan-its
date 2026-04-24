// e2e/mental-health/privacy-assertions.spec.ts
// M11 — Privacy assertion tests. These can run without a seeded DB for the auth tests,
// but the aggregate test requires a valid session.

import { test, expect } from '@playwright/test';

test.describe('M11 Privacy Assertions', () => {
  test('Unauthenticated user cannot access submissions endpoint', async ({ request }) => {
    const response = await request.get('/api/mental-health/submissions');
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('Unauthenticated user cannot access referrals endpoint', async ({ request }) => {
    const response = await request.get('/api/mental-health/referrals');
    // Must return 401 or 403 — never 200
    expect([401, 403]).toContain(response.status());
  });

  test('Unauthenticated user cannot access superadmin audit log', async ({ request }) => {
    const response = await request.get('/api/mental-health/superadmin/audit-log');
    expect([401, 403]).toContain(response.status());
  });

  test('Unauthenticated user cannot access consent endpoint', async ({ request }) => {
    const response = await request.post('/api/mental-health/consent', {
      data: { cohortId: 'test', consentVersion: 'v1.0', scope: {} },
    });
    expect([401, 403]).toContain(response.status());
  });

  test('Aggregate endpoint returns success:false for unauthenticated', async ({ request }) => {
    const response = await request.get('/api/mental-health/aggregate?cohortId=test&phase=F1');
    // Must not return 200 OK for unauthenticated
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  // NOTE: The following tests require authenticated sessions.
  // Uncomment and configure auth fixtures when test environment is available.

  // test('Aggregate endpoint has no individual userId', async ({ request }) => {
  //   // Authenticate as SC user
  //   const response = await request.get('/api/mental-health/aggregate?cohortId=test&phase=F1');
  //   if (response.ok()) {
  //     const body = await response.json();
  //     // Verify no individual userIds in response
  //     const bodyStr = JSON.stringify(body);
  //     expect(bodyStr).not.toMatch(/"userId":/);
  //   }
  // });

  // test('MABA cannot access SAC queue endpoint', async ({ request }) => {
  //   // Would need MABA auth token
  //   const response = await request.get('/api/mental-health/referrals');
  //   expect([401, 403]).toContain(response.status());
  // });
});
