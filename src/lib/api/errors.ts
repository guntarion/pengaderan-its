// src/lib/api/errors.ts
// Typed API errors with HTTP status codes and machine-readable error codes.
// Throw these from handlers — the middleware catches them and returns
// a standardized JSON error response.

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'BAD_REQUEST'
  | 'INTERNAL_ERROR';

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// --- Convenience factories ---

export function UnauthorizedError(message = 'Authentication required') {
  return new ApiError(401, 'UNAUTHORIZED', message);
}

export function ForbiddenError(message = 'Insufficient permissions') {
  return new ApiError(403, 'FORBIDDEN', message);
}

export function NotFoundError(resource = 'Resource') {
  return new ApiError(404, 'NOT_FOUND', `${resource} not found`);
}

export function ValidationError(message: string, details?: unknown) {
  return new ApiError(400, 'VALIDATION_ERROR', message, details);
}

export function ConflictError(message: string) {
  return new ApiError(409, 'CONFLICT', message);
}

export function RateLimitError(message: string, retryAfterSeconds?: number) {
  return new ApiError(429, 'RATE_LIMITED', message, { retryAfterSeconds });
}

export function BadRequestError(message: string) {
  return new ApiError(400, 'BAD_REQUEST', message);
}
