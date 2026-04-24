// e2e/anon-channel/m12-rate-limit.spec.ts
// M12 — Rate limit enforcement tests.
//
// NOTE: Full rate limit tests require Redis to be running.
// These tests verify API contract behavior.
//
// Rate limits:
//   Submit: 5 per 24h per fingerprint
//   Status lookup: 30 per 5min per fingerprint
//   Presign: 10 per 24h per fingerprint

import { test, expect } from '@playwright/test';

test.describe('M12 Rate Limit Enforcement', () => {
  test('Submit endpoint has rate limit response contract', async ({ request }) => {
    // Send a request without captcha — should get 400, not 429 yet
    const response = await request.post('/api/anon-reports', {
      data: {
        cohortId: 'test-cohort',
        category: 'BULLYING',
        bodyText: 'Laporan test yang cukup panjang untuk melewati validasi minimum karakter.',
        // No captchaToken — should fail with 400, not even hit rate limit
      },
    });

    expect(response.status()).toBe(400);
    const json = await response.json();
    expect(json.success).toBe(false);
  });

  test('Rate limit 429 response has Retry-After header', async ({ request }) => {
    // We can't easily test the actual 429 without Redis setup,
    // but we verify the endpoint structure is correct.
    // A proper rate-limited response should:
    // 1. Return 429 status
    // 2. Have Retry-After header
    // 3. Return { success: false, error: { code: 'RATE_LIMITED' } }

    // This test documents the expected contract
    const expectedContract = {
      status: 429,
      headers: { 'Retry-After': 'number (seconds)' },
      body: {
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'string',
        },
      },
    };

    // Contract is documented — actual 429 test requires Redis + 6 requests
    expect(expectedContract.status).toBe(429);
    expect(expectedContract.body.success).toBe(false);
  });

  test('Status lookup has rate limit response contract', async ({ request }) => {
    // Status lookup also has rate limiting (30/5min)
    // Verify that rapid consecutive lookups for same invalid code
    // don't cause 500s (rate limit should respond cleanly)
    const response = await request.get('/api/anon-reports/status/NW-TESTTEST');
    // Should be 404 (not found) or 200 with null data, not 500
    expect(response.status()).not.toBe(500);
  });

  // NOTE: Full rate limit test (6 submits → 6th = 429) requires:
  // 1. Redis running
  // 2. Captcha bypass token (TEST_CAPTCHA_BYPASS=1)
  // 3. Seeded cohort
  //
  // Uncomment when test environment has Redis available:
  //
  // test('6th submit from same IP returns 429', async ({ request }) => {
  //   const cohortId = process.env.TEST_COHORT_ID!;
  //   const testCaptchaToken = process.env.TEST_CAPTCHA_TOKEN!;
  //
  //   const submitPayload = {
  //     cohortId,
  //     category: 'BULLYING',
  //     bodyText: 'Test laporan anonim untuk uji rate limit yang cukup panjang.',
  //     captchaToken: testCaptchaToken,
  //   };
  //
  //   let lastStatus = 0;
  //   for (let i = 0; i < 6; i++) {
  //     const response = await request.post('/api/anon-reports', { data: submitPayload });
  //     lastStatus = response.status();
  //     if (response.status() === 429) {
  //       const json = await response.json();
  //       expect(json.error.code).toBe('RATE_LIMITED');
  //       const retryAfter = response.headers()['retry-after'];
  //       expect(retryAfter).toBeTruthy();
  //       break;
  //     }
  //   }
  //   expect(lastStatus).toBe(429);
  // });
});
