import { describe, it, expect } from 'vitest';
import {
  ApiError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  ConflictError,
  RateLimitError,
  BadRequestError,
} from '../api/errors';

describe('ApiError', () => {
  it('creates an error with all fields', () => {
    const err = new ApiError(422, 'VALIDATION_ERROR', 'Bad input', { field: 'email' });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.statusCode).toBe(422);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.message).toBe('Bad input');
    expect(err.details).toEqual({ field: 'email' });
    expect(err.name).toBe('ApiError');
  });
});

describe('Error factories', () => {
  it('UnauthorizedError defaults to 401', () => {
    const err = UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
    expect(err.message).toBe('Authentication required');
  });

  it('UnauthorizedError accepts custom message', () => {
    const err = UnauthorizedError('Token expired');
    expect(err.message).toBe('Token expired');
  });

  it('ForbiddenError defaults to 403', () => {
    const err = ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('NotFoundError includes resource name', () => {
    const err = NotFoundError('User');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('User not found');
  });

  it('NotFoundError uses default resource name', () => {
    const err = NotFoundError();
    expect(err.message).toBe('Resource not found');
  });

  it('ValidationError includes details', () => {
    const details = [{ field: 'email', message: 'Required' }];
    const err = ValidationError('Validation failed', details);
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.details).toEqual(details);
  });

  it('ConflictError returns 409', () => {
    const err = ConflictError('Email already exists');
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('CONFLICT');
  });

  it('RateLimitError returns 429 with retry info', () => {
    const err = RateLimitError('Too many requests', 30);
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe('RATE_LIMITED');
    expect(err.details).toEqual({ retryAfterSeconds: 30 });
  });

  it('BadRequestError returns 400', () => {
    const err = BadRequestError('Missing field');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('BAD_REQUEST');
  });
});
