// src/lib/api/response.ts
// Standardized API response format.
//
// Every endpoint returns:
//   Success: { success: true, data: T, meta?: { pagination } }
//   Error:   { success: false, error: { code, message, details? } }

import { NextResponse } from 'next/server';
import { ApiError } from './errors';

// ---- Types ----

export interface ApiSuccessBody<T = unknown> {
  success: true;
  data: T;
  meta?: {
    pagination?: PaginationMeta;
    [key: string]: unknown;
  };
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ---- Helpers ----

export const ApiResponse = {
  /**
   * Return a success response.
   *
   *   return ApiResponse.success(users);
   *   return ApiResponse.success(user, 201);
   */
  success<T>(data: T, status = 200, meta?: ApiSuccessBody['meta']): NextResponse<ApiSuccessBody<T>> {
    const body: ApiSuccessBody<T> = { success: true, data };
    if (meta) body.meta = meta;
    return NextResponse.json(body, { status });
  },

  /**
   * Return a paginated success response.
   *
   *   return ApiResponse.paginated(users, { page: 1, limit: 20, total: 100 });
   */
  paginated<T>(
    data: T[],
    pagination: { page: number; limit: number; total: number },
  ): NextResponse<ApiSuccessBody<T[]>> {
    return NextResponse.json({
      success: true,
      data,
      meta: {
        pagination: {
          ...pagination,
          totalPages: Math.ceil(pagination.total / pagination.limit),
        },
      },
    });
  },

  /**
   * Return an error response from an ApiError instance.
   *
   * Usually you don't call this directly — throw an ApiError and let the
   * middleware catch it.  But it's available for edge cases.
   */
  error(err: ApiError): NextResponse<ApiErrorBody> {
    const body: ApiErrorBody = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined && { details: err.details }),
      },
    };

    const headers: Record<string, string> = {};
    if (err.code === 'RATE_LIMITED' && err.details) {
      const d = err.details as { retryAfterSeconds?: number };
      if (d.retryAfterSeconds) {
        headers['Retry-After'] = String(d.retryAfterSeconds);
      }
    }

    return NextResponse.json(body, { status: err.statusCode, headers });
  },

  /**
   * Return an error response from a plain message.
   */
  fail(statusCode: number, code: string, message: string, details?: unknown): NextResponse<ApiErrorBody> {
    return NextResponse.json(
      {
        success: false,
        error: { code, message, ...(details !== undefined && { details }) },
      },
      { status: statusCode },
    );
  },
};
