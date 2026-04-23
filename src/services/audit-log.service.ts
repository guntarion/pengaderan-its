// src/services/audit-log.service.ts
// Generic audit logging for tracking user actions.
//
// Usage:
//   import { auditLog } from '@/services/audit-log.service';
//
//   await auditLog.record({
//     userId: user.id,
//     action: 'update',
//     resource: 'user',
//     resourceId: targetUser.id,
//     oldValue: { role: 'member' },
//     newValue: { role: 'admin' },
//     request: req,
//   });
//
//   // In API handlers with context:
//   await auditLog.fromContext(ctx, {
//     action: 'delete',
//     resource: 'project',
//     resourceId: projectId,
//   });

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import type { NextRequest } from 'next/server';
import type { ApiContext } from '@/lib/api/middleware';

const log = createLogger('audit-log');

// ---- Types ----

export interface AuditLogEntry {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogInput {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  /** Pass the request to auto-extract IP and User-Agent. */
  request?: NextRequest;
  metadata?: Record<string, unknown>;
}

export interface AuditLogContextInput {
  action: string;
  resource: string;
  resourceId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
}

export interface AuditLogQuery {
  userId?: string;
  resource?: string;
  resourceId?: string;
  action?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

// ---- Service ----

export const auditLog = {
  /**
   * Record an audit log entry.
   * Fire-and-forget by default — does not throw on failure.
   */
  async record(input: AuditLogInput): Promise<void> {
    try {
      const ip = input.request
        ? input.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
          input.request.headers.get('x-real-ip') ||
          undefined
        : undefined;
      const userAgent = input.request
        ? input.request.headers.get('user-agent') || undefined
        : undefined;

      await prisma.auditLog.create({
        data: {
          userId: input.userId,
          action: input.action,
          resource: input.resource,
          resourceId: input.resourceId,
          oldValue: input.oldValue !== undefined ? JSON.parse(JSON.stringify(input.oldValue)) : undefined,
          newValue: input.newValue !== undefined ? JSON.parse(JSON.stringify(input.newValue)) : undefined,
          ip,
          userAgent,
          metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : undefined,
        },
      });
    } catch (err) {
      // Audit logging should never break the main flow
      log.error('Failed to record audit log', { error: err, input: { action: input.action, resource: input.resource } });
    }
  },

  /**
   * Record an audit log entry using API handler context.
   * Auto-extracts userId from ctx.user.
   */
  async fromContext(
    ctx: ApiContext,
    input: AuditLogContextInput,
    request?: NextRequest,
  ): Promise<void> {
    await this.record({
      userId: ctx.user.id || undefined,
      ...input,
      request,
      metadata: {
        ...input.metadata,
        requestId: ctx.requestId,
      },
    });
  },

  /**
   * Query audit logs with filtering and pagination.
   */
  async query(params: AuditLogQuery = {}) {
    const { userId, resource, resourceId, action, from, to, page = 1, limit = 50 } = params;

    const where = {
      ...(userId && { userId }),
      ...(resource && { resource }),
      ...(resourceId && { resourceId }),
      ...(action && { action }),
      ...((from || to) && {
        createdAt: {
          ...(from && { gte: from }),
          ...(to && { lte: to }),
        },
      }),
    };

    const [entries, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Get audit trail for a specific resource.
   */
  async getResourceHistory(resource: string, resourceId: string, limit = 50) {
    return prisma.auditLog.findMany({
      where: { resource, resourceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  /**
   * Get recent activity for a user.
   */
  async getUserActivity(userId: string, limit = 50) {
    return prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },
};

// ---- Predefined action constants ----

export const AUDIT_ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  LOGIN: 'login',
  LOGOUT: 'logout',
  ROLE_CHANGE: 'role_change',
  PASSWORD_RESET: 'password_reset',
  SETTINGS_CHANGE: 'settings_change',
  EXPORT: 'export',
  IMPORT: 'import',
} as const;
