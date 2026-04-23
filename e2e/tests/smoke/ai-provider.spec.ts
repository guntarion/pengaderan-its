// e2e/tests/smoke/ai-provider.spec.ts
// Smoke tests for the AI test endpoint.

import { test, expect } from '@playwright/test';

test.describe('AI Provider Endpoint', () => {
  test('GET /api/ai/test responds without auth', async ({ request }) => {
    const response = await request.get('/api/ai/test');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('authenticated');
    expect(data.authenticated).toBe(false);
  });

  test('GET /api/ai/test responds with valid LLM key', async ({ request }) => {
    const llmKey = process.env.LLM_API_KEY;
    if (!llmKey) {
      test.skip();
      return;
    }

    const response = await request.get('/api/ai/test', {
      headers: { Authorization: `Bearer ${llmKey}` },
    });
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.authenticated).toBe(true);
  });

  test('POST /api/ai/test rejects without auth', async ({ request }) => {
    const response = await request.post('/api/ai/test', {
      data: { message: 'hello' },
    });
    // Should return 401 for unauthenticated
    expect(response.status()).toBe(401);
  });
});
