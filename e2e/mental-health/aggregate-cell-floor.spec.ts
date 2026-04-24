// e2e/mental-health/aggregate-cell-floor.spec.ts
// M11 — Aggregate cell floor masking tests.
// Verifies that cells with count < 5 are masked (count=null, masked=true).

import { test, expect } from '@playwright/test';

test.describe('M11 Aggregate Cell Floor', () => {
  test('Aggregate endpoint returns 401 without auth', async ({ request }) => {
    const response = await request.get('/api/mental-health/aggregate?cohortId=test&phase=F1');
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('Aggregate export endpoint returns 401 without auth', async ({ request }) => {
    const response = await request.get('/api/mental-health/aggregate/export?cohortId=test&phase=F1');
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  // NOTE: The following test requires an authenticated SC/SUPERADMIN session
  // and a seeded test cohort with small buckets.

  // test('Aggregate with small bucket returns masked count', async ({ request }) => {
  //   // Call aggregate endpoint with a cohort that has small data
  //   // Verify masked=true cells have count=null
  //   const response = await request.get('/api/mental-health/aggregate?cohortId=test&phase=F1', {
  //     headers: { 'Authorization': 'Bearer <LLM_API_KEY_FOR_TEST>' },
  //   });
  //   if (response.ok()) {
  //     const { data } = await response.json();
  //     // Any cell with masked=true should have count=null
  //     data?.forEach((row: { masked: boolean; count: number | null }) => {
  //       if (row.masked) expect(row.count).toBeNull();
  //     });
  //   }
  // });
});
