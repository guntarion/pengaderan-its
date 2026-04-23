// src/lib/api/index.ts
// Barrel export — import everything from '@/lib/api'.
//
//   import { createApiHandler, ApiResponse, validateBody, NotFoundError } from '@/lib/api';

export { ApiError, UnauthorizedError, ForbiddenError, NotFoundError, ValidationError, ConflictError, RateLimitError, BadRequestError } from './errors';
export type { ErrorCode } from './errors';

export { ApiResponse } from './response';
export type { ApiSuccessBody, ApiErrorBody, PaginationMeta } from './response';

export { validateBody, validateQuery, validateParams, paginationSchema, sortSchema, paginatedSortSchema, idParamSchema, roleSchema } from './validation';

export { createApiHandler, withAuth, withRoles } from './middleware';
export type { ApiContext, AuthenticatedHandler, ApiHandlerConfig } from './middleware';

export { createWebhookHandler } from './webhook';
export type { WebhookConfig, WebhookContext, WebhookEventHandler } from './webhook';
