// src/services/audit-log.service.ts
// Generic audit logging service for NAWASENA.
// Wraps the nawasena_audit_logs table.
//
// For NAWASENA-specific audit (pakta, role change, bulk import),
// use @/lib/audit/audit-helpers.ts directly with AuditAction enum.
//
// This service provides a generic API compatible with the rest of the template.

import { prisma } from '@/utils/prisma';
import { AuditAction } from '@prisma/client';
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

// Map generic action strings to AuditAction enum
function mapToAuditAction(action: string): AuditAction {
  const mapping: Record<string, AuditAction> = {
    create: AuditAction.USER_CREATE,
    update: AuditAction.USER_UPDATE,
    delete: AuditAction.USER_DEACTIVATE,
    login: AuditAction.LOGIN,
    logout: AuditAction.LOGOUT,
    role_change: AuditAction.USER_ROLE_CHANGE,
    import: AuditAction.USER_BULK_IMPORT,
    // M15 notification actions
    CRON_MANUAL_TRIGGER: AuditAction.CRON_MANUAL_TRIGGER,
    NOTIFICATION_RULE_CREATE: AuditAction.NOTIFICATION_RULE_CREATE,
    NOTIFICATION_RULE_UPDATE: AuditAction.NOTIFICATION_RULE_UPDATE,
    NOTIFICATION_RULE_DELETE: AuditAction.NOTIFICATION_RULE_DELETE,
    NOTIFICATION_TEMPLATE_PUBLISH: AuditAction.NOTIFICATION_TEMPLATE_PUBLISH,
    NOTIFICATION_PREFERENCE_UPDATE: AuditAction.NOTIFICATION_PREFERENCE_UPDATE,
  };
  return mapping[action] ?? AuditAction.USER_UPDATE;
}

// ---- Service ----

export const auditLog = {
  /**
   * Record an audit log entry.
   * Fire-and-forget — does not throw on failure.
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

      await prisma.nawasenaAuditLog.create({
        data: {
          actorUserId: input.userId ?? undefined,
          action: mapToAuditAction(input.action),
          entityType: input.resource,
          entityId: input.resourceId ?? input.userId ?? 'unknown',
          beforeValue: input.oldValue !== undefined
            ? JSON.parse(JSON.stringify(input.oldValue))
            : undefined,
          afterValue: input.newValue !== undefined
            ? JSON.parse(JSON.stringify(input.newValue))
            : undefined,
          ipAddress: ip,
          userAgent: userAgent,
          metadata: input.metadata
            ? JSON.parse(JSON.stringify(input.metadata))
            : undefined,
        },
      });
    } catch (err) {
      log.error('Failed to record audit log', {
        error: err,
        input: { action: input.action, resource: input.resource },
      });
    }
  },

  /**
   * Record an audit log entry using API handler context.
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
    const { userId, entityType, action, from, to, page = 1, limit = 50 } = {
      entityType: params.resource,
      ...params,
    };

    const where = {
      ...(userId && { actorUserId: userId }),
      ...(entityType && { entityType }),
      ...(action && { action: mapToAuditAction(action) }),
      ...((from || to) && {
        createdAt: {
          ...(from && { gte: from }),
          ...(to && { lte: to }),
        },
      }),
    };

    const [entries, total] = await Promise.all([
      prisma.nawasenaAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.nawasenaAuditLog.count({ where }),
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
    return prisma.nawasenaAuditLog.findMany({
      where: { entityType: resource, entityId: resourceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  /**
   * Get recent activity for a user.
   */
  async getUserActivity(userId: string, limit = 50) {
    return prisma.nawasenaAuditLog.findMany({
      where: { actorUserId: userId },
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
  // M15 Notification actions
  CRON_MANUAL_TRIGGER: 'CRON_MANUAL_TRIGGER',
  NOTIFICATION_RULE_CREATE: 'NOTIFICATION_RULE_CREATE',
  NOTIFICATION_RULE_UPDATE: 'NOTIFICATION_RULE_UPDATE',
  NOTIFICATION_RULE_DELETE: 'NOTIFICATION_RULE_DELETE',
  NOTIFICATION_TEMPLATE_PUBLISH: 'NOTIFICATION_TEMPLATE_PUBLISH',
  NOTIFICATION_PREFERENCE_UPDATE: 'NOTIFICATION_PREFERENCE_UPDATE',
} as const;
