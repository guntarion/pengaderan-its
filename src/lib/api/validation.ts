// src/lib/api/validation.ts
// Request validation helpers using Zod.
// Throws ApiError(VALIDATION_ERROR) on failure so the middleware
// catches it and returns a standardized 400 response.

import { type NextRequest } from 'next/server';
import { type ZodSchema, ZodError, z } from 'zod';
import { ValidationError } from './errors';

/**
 * Parse and validate the JSON body of a request.
 *
 *   const { name, email } = await validateBody(request, createUserSchema);
 */
export async function validateBody<T>(request: NextRequest | Request, schema: ZodSchema<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw ValidationError('Invalid JSON body');
  }
  return parseWithSchema(schema, raw);
}

/**
 * Parse and validate URL search params.
 *
 *   const { page, limit } = validateQuery(request, paginationSchema);
 */
export function validateQuery<T>(request: NextRequest, schema: ZodSchema<T>): T {
  const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
  return parseWithSchema(schema, raw);
}

/**
 * Parse and validate route params (from the Next.js context object).
 *
 *   const { id } = validateParams({ id }, idParamSchema);
 */
export function validateParams<T>(params: Record<string, string | string[]>, schema: ZodSchema<T>): T {
  return parseWithSchema(schema, params);
}

// ---- Internal ----

function parseWithSchema<T>(schema: ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (err) {
    if (err instanceof ZodError) {
      const details = err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      throw ValidationError('Validation failed', details);
    }
    throw err;
  }
}

// ---- Common Schemas ----

/** Pagination query params: ?page=1&limit=20 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** Sort query params: ?sortBy=createdAt&sortOrder=desc */
export const sortSchema = z.object({
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/** Pagination + sort combined */
export const paginatedSortSchema = paginationSchema.merge(sortSchema);

/** Route param with CUID/UUID id */
export const idParamSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

/** Valid user roles */
export const roleSchema = z.enum(['admin', 'moderator', 'editor', 'member', 'viewer', 'guest']);
