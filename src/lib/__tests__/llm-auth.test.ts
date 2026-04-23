// src/lib/__tests__/llm-auth.test.ts
// Unit tests for LLM API key authentication.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
vi.mock('@/utils/prisma', () => ({
  prisma: {
    user: {
      findFirst: vi.fn().mockResolvedValue({
        id: 'admin-123',
        email: 'admin@test.com',
        name: 'Test Admin',
        role: 'admin',
      }),
    },
  },
}));

// Mock NextAuth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/app/api/auth/[...nextauth]/options', () => ({
  authOptions: {},
}));

beforeEach(() => {
  vi.stubEnv('LLM_API_KEY', 'test-llm-api-key');
});

describe('verifyLLMAuth', () => {
  it('returns user for valid Bearer token', async () => {
    const { verifyLLMAuth } = await import('../llm-auth');
    const request = new Request('http://localhost:3000/api/test', {
      headers: { Authorization: 'Bearer test-llm-api-key' },
    });
    const result = await verifyLLMAuth(request);
    expect(result).not.toBeNull();
    expect(result!.role).toBe('admin');
  });

  it('returns user for valid x-api-key header', async () => {
    const { verifyLLMAuth } = await import('../llm-auth');
    const request = new Request('http://localhost:3000/api/test', {
      headers: { 'x-api-key': 'test-llm-api-key' },
    });
    const result = await verifyLLMAuth(request);
    expect(result).not.toBeNull();
    expect(result!.role).toBe('admin');
  });

  it('returns null for invalid key', async () => {
    const { verifyLLMAuth } = await import('../llm-auth');
    const request = new Request('http://localhost:3000/api/test', {
      headers: { Authorization: 'Bearer wrong-key' },
    });
    const result = await verifyLLMAuth(request);
    expect(result).toBeNull();
  });

  it('returns null when no auth headers present', async () => {
    const { verifyLLMAuth } = await import('../llm-auth');
    const request = new Request('http://localhost:3000/api/test');
    const result = await verifyLLMAuth(request);
    expect(result).toBeNull();
  });

  it('returns null when LLM_API_KEY not configured', async () => {
    vi.stubEnv('LLM_API_KEY', '');
    vi.resetModules();
    const { verifyLLMAuth } = await import('../llm-auth');
    const request = new Request('http://localhost:3000/api/test', {
      headers: { Authorization: 'Bearer some-key' },
    });
    const result = await verifyLLMAuth(request);
    expect(result).toBeNull();
  });
});

describe('getAuthUser', () => {
  it('returns LLM user when valid API key provided', async () => {
    const { getAuthUser } = await import('../llm-auth');
    const request = new Request('http://localhost:3000/api/test', {
      headers: { Authorization: 'Bearer test-llm-api-key' },
    });
    const result = await getAuthUser(request);
    expect(result).not.toBeNull();
    expect(result!.role).toBe('admin');
  });

  it('falls back to session when no API key', async () => {
    const { getAuthUser } = await import('../llm-auth');
    const request = new Request('http://localhost:3000/api/test');
    const result = await getAuthUser(request);
    // Session mock returns null, so result should be null
    expect(result).toBeNull();
  });
});
