import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  validateBody,
  validateQuery,
  validateParams,
  paginationSchema,
  sortSchema,
  idParamSchema,
  roleSchema,
} from '../api/validation';
import { ApiError } from '../api/errors';

// Helper to create a NextRequest with JSON body
function createRequest(body: unknown, url = 'http://localhost:3000/api/test') {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('validateBody', () => {
  const schema = z.object({
    name: z.string().min(1),
    age: z.number().int().positive(),
  });

  it('returns parsed data for valid body', async () => {
    const req = createRequest({ name: 'Alice', age: 30 });
    const result = await validateBody(req, schema);
    expect(result).toEqual({ name: 'Alice', age: 30 });
  });

  it('throws ApiError for invalid body', async () => {
    const req = createRequest({ name: '', age: -1 });
    await expect(validateBody(req, schema)).rejects.toThrow(ApiError);
  });

  it('includes field-level details in validation error', async () => {
    const req = createRequest({ name: '' });
    try {
      await validateBody(req, schema);
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.code).toBe('VALIDATION_ERROR');
      expect(apiErr.details).toBeInstanceOf(Array);
      expect((apiErr.details as Array<{ field: string }>).some((d) => d.field === 'name')).toBe(true);
    }
  });

  it('throws for non-JSON body', async () => {
    const req = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      body: 'not json',
    });
    await expect(validateBody(req, schema)).rejects.toThrow('Invalid JSON body');
  });

  it('strips unknown fields', async () => {
    const req = createRequest({ name: 'Bob', age: 25, extra: true });
    const result = await validateBody(req, schema);
    expect(result).toEqual({ name: 'Bob', age: 25 });
    expect((result as Record<string, unknown>).extra).toBeUndefined();
  });
});

describe('validateQuery', () => {
  it('parses query params', () => {
    const req = new NextRequest('http://localhost:3000/api/test?page=2&limit=50');
    const result = validateQuery(req, paginationSchema);
    expect(result).toEqual({ page: 2, limit: 50 });
  });

  it('uses defaults for missing params', () => {
    const req = new NextRequest('http://localhost:3000/api/test');
    const result = validateQuery(req, paginationSchema);
    expect(result).toEqual({ page: 1, limit: 20 });
  });

  it('throws for invalid query params', () => {
    const req = new NextRequest('http://localhost:3000/api/test?page=-1');
    expect(() => validateQuery(req, paginationSchema)).toThrow(ApiError);
  });

  it('coerces string values to numbers', () => {
    const req = new NextRequest('http://localhost:3000/api/test?page=3&limit=15');
    const result = validateQuery(req, paginationSchema);
    expect(typeof result.page).toBe('number');
    expect(typeof result.limit).toBe('number');
  });
});

describe('validateParams', () => {
  it('validates route params', () => {
    const result = validateParams({ id: 'abc-123' }, idParamSchema);
    expect(result).toEqual({ id: 'abc-123' });
  });

  it('throws for missing id', () => {
    expect(() => validateParams({ id: '' }, idParamSchema)).toThrow(ApiError);
  });
});

describe('Common schemas', () => {
  it('sortSchema has defaults', () => {
    const result = sortSchema.parse({});
    expect(result).toEqual({ sortBy: 'createdAt', sortOrder: 'desc' });
  });

  it('sortSchema validates sortOrder enum', () => {
    expect(() => sortSchema.parse({ sortOrder: 'invalid' })).toThrow();
  });

  it('roleSchema accepts valid roles', () => {
    expect(roleSchema.parse('admin')).toBe('admin');
    expect(roleSchema.parse('member')).toBe('member');
    expect(roleSchema.parse('viewer')).toBe('viewer');
  });

  it('roleSchema rejects invalid role', () => {
    expect(() => roleSchema.parse('superadmin')).toThrow();
  });

  it('paginationSchema enforces max limit', () => {
    expect(() => paginationSchema.parse({ limit: 200 })).toThrow();
  });
});
