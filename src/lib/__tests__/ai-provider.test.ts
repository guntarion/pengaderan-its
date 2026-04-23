// src/lib/__tests__/ai-provider.test.ts
// Unit tests for AI provider utility functions (no real API calls).

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock env vars before importing
beforeEach(() => {
  vi.stubEnv('QWEN_API_KEY', 'test-qwen-key');
  vi.stubEnv('DEEPSEEK_API_KEY', 'test-deepseek-key');
  vi.stubEnv('PERPLEXITY_API_KEY', 'test-perplexity-key');
  vi.stubEnv('AI_RESTRICTION', 'OFF');
});

describe('AI Provider Utilities', () => {
  it('getAvailableProvider returns qwen when QWEN_API_KEY is set', async () => {
    const { getAvailableProvider } = await import('../ai-provider');
    expect(getAvailableProvider()).toBe('qwen');
  });

  it('isAIRestricted returns false when AI_RESTRICTION is OFF', async () => {
    const { isAIRestricted } = await import('../ai-provider');
    expect(isAIRestricted()).toBe(false);
  });

  it('isAIRestricted returns true when AI_RESTRICTION is ON', async () => {
    vi.stubEnv('AI_RESTRICTION', 'ON');
    // Re-import to pick up new env
    vi.resetModules();
    const { isAIRestricted } = await import('../ai-provider');
    expect(isAIRestricted()).toBe(true);
  });

  it('isWebSearchAvailable returns true when PERPLEXITY_API_KEY is set', async () => {
    const { isWebSearchAvailable } = await import('../ai-provider');
    expect(isWebSearchAvailable()).toBe(true);
  });

  it('checkProviderAvailability returns all providers', async () => {
    const { checkProviderAvailability } = await import('../ai-provider');
    const result = checkProviderAvailability();
    expect(result.qwen).toBe(true);
    expect(result.deepseek).toBe(true);
    expect(result.perplexity).toBe(true);
    expect(result.primary).toBe('qwen');
  });

  it('getModelName returns correct models for each mode', async () => {
    const { getModelName } = await import('../ai-provider');
    expect(getModelName('qwen', 'chat')).toBe('qwen-turbo-latest');
    expect(getModelName('qwen', 'reasoning')).toBe('qwen-plus');
    expect(getModelName('deepseek', 'chat')).toBe('deepseek-chat');
    expect(getModelName('deepseek', 'reasoning')).toBe('deepseek-reasoner');
  });

  it('calculateCost computes cost correctly', async () => {
    const { calculateCost } = await import('../ai-provider');
    // qwen-turbo-latest: $0.10/M input, $0.30/M output
    const cost = calculateCost('qwen-turbo-latest', 1000, 1000);
    const expected = (1000 * 0.10 + 1000 * 0.30) / 1_000_000;
    expect(cost).toBeCloseTo(expected, 8);
  });

  it('calculateCost uses default pricing for unknown models', async () => {
    const { calculateCost } = await import('../ai-provider');
    const cost = calculateCost('unknown-model', 1000, 1000);
    expect(cost).toBeGreaterThan(0);
  });

  it('extractUsageWithCost returns correct structure', async () => {
    const { extractUsageWithCost } = await import('../ai-provider');
    const result = extractUsageWithCost({
      content: 'test',
      provider: 'qwen',
      model: 'qwen-turbo-latest',
      usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
    });
    expect(result.inputTokens).toBe(100);
    expect(result.outputTokens).toBe(200);
    expect(result.tokensUsed).toBe(300);
    expect(result.costUSD).toBeGreaterThan(0);
  });

  it('extractUsageWithCost handles missing usage', async () => {
    const { extractUsageWithCost } = await import('../ai-provider');
    const result = extractUsageWithCost({
      content: 'test',
      provider: 'qwen',
      model: 'qwen-turbo-latest',
    });
    expect(result.inputTokens).toBe(0);
    expect(result.outputTokens).toBe(0);
    expect(result.tokensUsed).toBe(0);
  });
});
