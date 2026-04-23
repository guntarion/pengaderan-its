// e2e/fixtures/ai-mock.fixture.ts
// Fixtures that mock AI API routes for deterministic E2E testing.

import { test as base, type Page, type Route } from '@playwright/test';

type AIMockFixtures = {
  mockAIPage: Page;
};

const MOCK_AI_RESPONSE = {
  id: 'mock-completion-001',
  object: 'chat.completion',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: 'This is a mocked AI response for E2E testing.',
      },
      finish_reason: 'stop',
    },
  ],
  usage: {
    prompt_tokens: 10,
    completion_tokens: 15,
    total_tokens: 25,
  },
};

async function mockAIRoutes(page: Page) {
  // Mock external AI provider APIs
  await page.route('**/api.together.xyz/**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_AI_RESPONSE),
    });
  });

  await page.route('**/api.deepseek.com/**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_AI_RESPONSE),
    });
  });

  await page.route('**/api.perplexity.ai/**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_AI_RESPONSE),
    });
  });
}

export const test = base.extend<AIMockFixtures>({
  mockAIPage: async ({ page }, use) => {
    await mockAIRoutes(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';
