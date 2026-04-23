import { describe, it, expect } from 'vitest';
import { ApiResponse } from '../api/response';
import { ApiError } from '../api/errors';

describe('ApiResponse.success', () => {
  it('wraps data in standard format', async () => {
    const res = ApiResponse.success({ name: 'Alice' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      success: true,
      data: { name: 'Alice' },
    });
  });

  it('accepts custom status code', async () => {
    const res = ApiResponse.success({ id: '1' }, 201);
    expect(res.status).toBe(201);
  });

  it('includes meta when provided', async () => {
    const res = ApiResponse.success([1, 2], 200, { custom: 'value' });
    const body = await res.json();
    expect(body.meta).toEqual({ custom: 'value' });
  });
});

describe('ApiResponse.paginated', () => {
  it('includes pagination meta', async () => {
    const items = [{ id: 1 }, { id: 2 }];
    const res = ApiResponse.paginated(items, { page: 2, limit: 10, total: 25 });
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.data).toEqual(items);
    expect(body.meta.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
    });
  });

  it('calculates totalPages correctly for exact division', async () => {
    const res = ApiResponse.paginated([], { page: 1, limit: 5, total: 20 });
    const body = await res.json();
    expect(body.meta.pagination.totalPages).toBe(4);
  });

  it('handles zero total', async () => {
    const res = ApiResponse.paginated([], { page: 1, limit: 10, total: 0 });
    const body = await res.json();
    expect(body.meta.pagination.totalPages).toBe(0);
  });
});

describe('ApiResponse.error', () => {
  it('formats ApiError correctly', async () => {
    const err = new ApiError(404, 'NOT_FOUND', 'User not found');
    const res = ApiResponse.error(err);
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body).toEqual({
      success: false,
      error: { code: 'NOT_FOUND', message: 'User not found' },
    });
  });

  it('includes details when present', async () => {
    const err = new ApiError(400, 'VALIDATION_ERROR', 'Bad', [{ field: 'x' }]);
    const body = await ApiResponse.error(err).json();
    expect(body.error.details).toEqual([{ field: 'x' }]);
  });

  it('sets Retry-After header for rate limit errors', () => {
    const err = new ApiError(429, 'RATE_LIMITED', 'Slow down', { retryAfterSeconds: 60 });
    const res = ApiResponse.error(err);
    expect(res.headers.get('Retry-After')).toBe('60');
  });
});

describe('ApiResponse.fail', () => {
  it('creates error response from plain values', async () => {
    const res = ApiResponse.fail(500, 'INTERNAL_ERROR', 'Something broke');
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('Something broke');
  });
});
