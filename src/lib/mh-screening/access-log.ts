/**
 * src/lib/mh-screening/access-log.ts
 * NAWASENA M11 — MHAccessLog helper (append-only audit log).
 *
 * MUST always be called within the same transaction as the data operation.
 * If this INSERT fails, the entire transaction rolls back — data access fails safely.
 *
 * PRIVACY-CRITICAL: IP is hashed before storage. No plaintext PII in this log.
 */

import { createHash } from 'crypto';
import { createLogger } from '@/lib/logger';
import type { MHAccessAction, UserRole } from '@prisma/client';

const log = createLogger('mh-access-log');

export interface MHAccessLogParams {
  actorId: string;
  actorRole: UserRole;
  action: MHAccessAction;
  targetType: string;
  targetId?: string;
  targetUserId?: string;
  organizationId?: string;
  reason?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaTransactionClient = any;

/**
 * Hash an IP address using SHA-256.
 * Never store raw IPs in MH audit log — only hashed form.
 */
function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

/**
 * Truncate user agent to max 200 chars (consistent with schema intent).
 */
function truncateUserAgent(ua: string | undefined): string | undefined {
  if (!ua) return undefined;
  return ua.length > 200 ? ua.slice(0, 200) : ua;
}

/**
 * Record an access to MH data. MUST be called within a transaction.
 * The INSERT happens in the same DB transaction as the data access/mutation.
 * If this fails, the entire transaction rolls back (fail-closed).
 *
 * @param tx - Prisma transaction client
 * @param params - Access log parameters
 */
export async function recordMHAccess(
  tx: PrismaTransactionClient,
  params: MHAccessLogParams,
): Promise<void> {
  log.info('Recording MH access', {
    actorId: params.actorId,
    actorRole: params.actorRole,
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId,
    targetUserId: params.targetUserId,
    organizationId: params.organizationId,
  });

  await tx.mHAccessLog.create({
    data: {
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId ?? null,
      targetUserId: params.targetUserId ?? null,
      organizationId: params.organizationId ?? null,
      reason: params.reason ?? null,
      ipHash: params.ip ? hashIp(params.ip) : null,
      userAgent: truncateUserAgent(params.userAgent),
      metadata: params.metadata ?? null,
    },
  });
}
