import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock getAuthUser
const mockGetAuthUser = vi.fn();
vi.mock('@/lib/llm-auth', () => ({
  getAuthUser: (...args: unknown[]) => mockGetAuthUser(...args),
}));

// Mock rate limiter
vi.mock('@/lib/ratelimit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
}));

import { createApiHandler, withAuth, withRoles } from '../api/middleware';
import { ApiResponse } from '../api/response';

const ADMIN_USER = { id: 'u1', email: 'admin@test.com', name: 'Admin', role: 'admin' };
const MEMBER_USER = { id: 'u2', email: 'user@test.com', name: 'User', role: 'member' };

function makeRequest(url = 'http://localhost:3000/api/test') {
  return new NextRequest(url, { method: 'GET' });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createApiHandler', () => {
  it('calls handler when no auth required', async () => {
    mockGetAuthUser.mockResolvedValue(null);
    const handler = createApiHandler({
      handler: async () => ApiResponse.success({ ok: true }),
    });
    const res = await handler(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual({ ok: true });
  });

  it('returns 401 when auth required but no user', async () => {
    mockGetAuthUser.mockResolvedValue(null);
    const handler = createApiHandler({
      auth: true,
      handler: async () => ApiResponse.success({}),
    });
    const res = await handler(makeRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('passes user to handler when authenticated', async () => {
    mockGetAuthUser.mockResolvedValue(ADMIN_USER);
    const handler = createApiHandler({
      auth: true,
      handler: async (_req, ctx) => ApiResponse.success({ userId: ctx.user.id }),
    });
    const res = await handler(makeRequest());
    const body = await res.json();
    expect(body.data.userId).toBe('u1');
  });

  it('returns 403 when user lacks required role', async () => {
    mockGetAuthUser.mockResolvedValue(MEMBER_USER);
    const handler = createApiHandler({
      roles: ['admin'],
      handler: async () => ApiResponse.success({}),
    });
    const res = await handler(makeRequest());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('allows access with correct role', async () => {
    mockGetAuthUser.mockResolvedValue(ADMIN_USER);
    const handler = createApiHandler({
      roles: ['admin'],
      handler: async () => ApiResponse.success({ access: 'granted' }),
    });
    const res = await handler(makeRequest());
    expect(res.status).toBe(200);
  });

  it('accepts multiple allowed roles', async () => {
    mockGetAuthUser.mockResolvedValue(MEMBER_USER);
    const handler = createApiHandler({
      roles: ['admin', 'member'],
      handler: async () => ApiResponse.success({ access: 'granted' }),
    });
    const res = await handler(makeRequest());
    expect(res.status).toBe(200);
  });

  it('resolves route params from context', async () => {
    mockGetAuthUser.mockResolvedValue(ADMIN_USER);
    const handler = createApiHandler({
      auth: true,
      handler: async (_req, ctx) => ApiResponse.success({ id: ctx.params.id }),
    });
    const res = await handler(makeRequest(), { params: Promise.resolve({ id: 'abc' }) });
    const body = await res.json();
    expect(body.data.id).toBe('abc');
  });

  it('handles plain params object (non-Promise)', async () => {
    mockGetAuthUser.mockResolvedValue(ADMIN_USER);
    const handler = createApiHandler({
      auth: true,
      handler: async (_req, ctx) => ApiResponse.success({ id: ctx.params.id }),
    });
    const res = await handler(makeRequest(), { params: { id: 'xyz' } });
    const body = await res.json();
    expect(body.data.id).toBe('xyz');
  });

  it('catches thrown ApiError and returns formatted response', async () => {
    mockGetAuthUser.mockResolvedValue(ADMIN_USER);
    const { NotFoundError } = await import('../api/errors');
    const handler = createApiHandler({
      auth: true,
      handler: async () => {
        throw NotFoundError('User');
      },
    });
    const res = await handler(makeRequest());
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toBe('User not found');
  });

  it('catches unexpected errors and returns 500', async () => {
    mockGetAuthUser.mockResolvedValue(ADMIN_USER);
    const handler = createApiHandler({
      auth: true,
      handler: async () => {
        throw new Error('DB connection lost');
      },
    });
    const res = await handler(makeRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});

describe('withAuth', () => {
  it('is a shortcut for createApiHandler with auth: true', async () => {
    mockGetAuthUser.mockResolvedValue(ADMIN_USER);
    const handler = withAuth(async (_req, ctx) =>
      ApiResponse.success({ email: ctx.user.email }),
    );
    const res = await handler(makeRequest());
    const body = await res.json();
    expect(body.data.email).toBe('admin@test.com');
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetAuthUser.mockResolvedValue(null);
    const handler = withAuth(async () => ApiResponse.success({}));
    const res = await handler(makeRequest());
    expect(res.status).toBe(401);
  });
});

describe('withRoles', () => {
  it('is a shortcut for createApiHandler with auth + roles', async () => {
    mockGetAuthUser.mockResolvedValue(MEMBER_USER);
    const handler = withRoles(['admin'], async () => ApiResponse.success({}));
    const res = await handler(makeRequest());
    expect(res.status).toBe(403);
  });
});
