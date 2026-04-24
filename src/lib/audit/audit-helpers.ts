/**
 * src/lib/audit/audit-helpers.ts
 * Manual audit log helpers for operations not covered by Prisma extension.
 *
 * Use for: LOGIN, LOGOUT, SUPERADMIN_CROSS_ORG_ACCESS, USER_BULK_IMPORT,
 *          FULL_DELETE_USER, EMERGENCY_BULK_SIGN, USER_EMERGENCY_CONTACT_ACCESSED.
 */

import { prisma } from '@/utils/prisma';
import { AuditAction, Prisma } from '@prisma/client';
import { createLogger } from '@/lib/logger';

const log = createLogger('audit-helpers');

export interface LogAuditParams {
  action: AuditAction;
  organizationId?: string | null;
  actorUserId?: string | null;
  subjectUserId?: string | null;
  entityType: string;
  entityId: string;
  beforeValue?: Prisma.JsonValue;
  afterValue?: Prisma.JsonValue;
  reason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.JsonValue;
}

/**
 * Write a manual audit log entry.
 * Fire-and-forget — does not throw.
 */
export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    await prisma.nawasenaAuditLog.create({
      data: {
        action: params.action,
        organizationId: params.organizationId ?? undefined,
        actorUserId: params.actorUserId ?? undefined,
        subjectUserId: params.subjectUserId ?? undefined,
        entityType: params.entityType,
        entityId: params.entityId,
        beforeValue: params.beforeValue ?? undefined,
        afterValue: params.afterValue ?? undefined,
        reason: params.reason ?? undefined,
        ipAddress: params.ipAddress ?? undefined,
        userAgent: params.userAgent ?? undefined,
        metadata: params.metadata ?? undefined,
      },
    });
  } catch (err) {
    log.error('Failed to write audit log', { action: params.action, entityId: params.entityId, error: err });
  }
}

/**
 * Extract IP and UserAgent from a Next.js Request object.
 */
export function extractRequestMeta(request: Request): { ipAddress: string | null; userAgent: string | null } {
  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    null;
  const userAgent = request.headers.get('user-agent') ?? null;
  return { ipAddress, userAgent };
}

/**
 * Log a login event.
 */
export async function logLogin(params: {
  userId: string;
  organizationId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  await logAudit({
    action: AuditAction.LOGIN,
    organizationId: params.organizationId,
    actorUserId: params.userId,
    entityType: 'User',
    entityId: params.userId,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });
}

/**
 * Log a logout event.
 */
export async function logLogout(params: {
  userId: string;
  organizationId: string;
  ipAddress?: string | null;
}): Promise<void> {
  await logAudit({
    action: AuditAction.LOGOUT,
    organizationId: params.organizationId,
    actorUserId: params.userId,
    entityType: 'User',
    entityId: params.userId,
    ipAddress: params.ipAddress,
  });
}

/**
 * Log a role change event (with mandatory reason).
 */
export async function logRoleChange(params: {
  actorUserId: string;
  subjectUserId: string;
  organizationId: string;
  oldRole: string;
  newRole: string;
  reason: string;
  ipAddress?: string | null;
}): Promise<void> {
  await logAudit({
    action: AuditAction.USER_ROLE_CHANGE,
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    subjectUserId: params.subjectUserId,
    entityType: 'User',
    entityId: params.subjectUserId,
    beforeValue: { role: params.oldRole },
    afterValue: { role: params.newRole },
    reason: params.reason,
    ipAddress: params.ipAddress,
  });
}

/**
 * Log bulk import summary.
 */
export async function logBulkImport(params: {
  actorUserId: string;
  organizationId: string;
  fileHash: string;
  totalRows: number;
  committed: number;
  updated: number;
  skipped: number;
  failed: number;
  ipAddress?: string | null;
}): Promise<void> {
  await logAudit({
    action: AuditAction.USER_BULK_IMPORT,
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    entityType: 'BulkImport',
    entityId: params.fileHash,
    metadata: {
      fileHash: params.fileHash,
      totalRows: params.totalRows,
      committed: params.committed,
      updated: params.updated,
      skipped: params.skipped,
      failed: params.failed,
    },
    ipAddress: params.ipAddress,
  });
}
