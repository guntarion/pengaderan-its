/**
 * src/lib/tenant/context.ts
 * Tenant context using AsyncLocalStorage for per-request isolation.
 *
 * Stores: organizationId, userId, role, bypass flag.
 * Used by Prisma tenant extension and audit log extension.
 */

import { AsyncLocalStorage } from 'async_hooks';
import { createLogger } from '@/lib/logger';

const log = createLogger('tenant-context');

export interface TenantContext {
  organizationId: string;
  userId: string;
  role: string;
  bypassRls?: boolean;
  suspendAudit?: boolean; // for bulk import
}

const tenantStorage = new AsyncLocalStorage<TenantContext>();

/**
 * Run a function within a tenant context.
 * The context is available to all nested calls via getTenantContext().
 */
export function runWithTenant<T>(ctx: TenantContext, fn: () => T): T {
  log.debug('Running with tenant context', {
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    role: ctx.role,
    bypass: ctx.bypassRls,
  });
  return tenantStorage.run(ctx, fn);
}

/**
 * Get the current tenant context (throws if not in a tenant context).
 */
export function getTenantContext(): TenantContext {
  const ctx = tenantStorage.getStore();
  if (!ctx) {
    throw new Error('No tenant context available. Wrap your code with runWithTenant().');
  }
  return ctx;
}

/**
 * Get the current tenant context, returning null if not set.
 * Use this in contexts where tenant context is optional.
 */
export function getTenantContextOptional(): TenantContext | null {
  return tenantStorage.getStore() ?? null;
}
