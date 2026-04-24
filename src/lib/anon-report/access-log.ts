/**
 * src/lib/anon-report/access-log.ts
 * NAWASENA M12 — Audit log helper for AnonReport access.
 *
 * Every protected endpoint that reads or writes AnonReport MUST call
 * recordAnonAccess() within the same transaction as the operation.
 *
 * If the access log INSERT fails, the outer transaction will roll back,
 * preventing any operation from occurring without an audit trail.
 *
 * This is enforced by:
 *   1. ESLint custom rule requiring import of recordAnonAccess in all
 *      files under src/app/api/anon-reports/[id]/**
 *   2. Integration tests that verify audit entry exists after each operation
 *
 * Usage:
 *   await prisma.$transaction(async (tx) => {
 *     await setAnonSessionVars(tx, user);
 *     const report = await tx.anonReport.findUnique({ where: { id } });
 *     await recordAnonAccess(tx, user, report.id, 'READ');
 *     return report;
 *   });
 */

import { Prisma, AnonAccessAction } from '@prisma/client';
import { createHash } from 'crypto';
import { createLogger } from '@/lib/logger';

const log = createLogger('anon-access-log');

export interface AnonActor {
  id: string;
  role: string;
}

/**
 * Record an audit entry for a protected AnonReport access operation.
 *
 * Must be called inside a Prisma transaction (same tx as the operation).
 * If this INSERT fails, the whole transaction rolls back.
 *
 * @param tx - Prisma transaction client
 * @param actor - The BLM/Satgas/SUPERADMIN user performing the action
 * @param reportId - The AnonReport id being accessed
 * @param action - The audit action type
 * @param meta - Optional metadata (before/after for UPDATE, key for DOWNLOAD)
 * @param ipForHashing - Optional raw IP (will be SHA-256 hashed before storing)
 */
export async function recordAnonAccess(
  tx: Prisma.TransactionClient,
  actor: AnonActor,
  reportId: string,
  action: AnonAccessAction,
  meta?: Record<string, unknown>,
  ipForHashing?: string,
): Promise<void> {
  // Hash the IP if provided (never store raw IP)
  let actorIpHash: string | undefined;
  if (ipForHashing) {
    actorIpHash = createHash('sha256').update(ipForHashing).digest('hex').slice(0, 64);
  }

  try {
    await tx.anonReportAccessLog.create({
      data: {
        reportId,
        actorId: actor.id,
        actorRole: actor.role,
        actorIpHash,
        action,
        meta: meta ? (meta as Prisma.InputJsonValue) : undefined,
      },
    });

    log.debug('Anon access logged', {
      actorId: actor.id,
      reportId: reportId.slice(0, 8) + '...',
      action,
    });
  } catch (err) {
    // Re-throw — caller's transaction will roll back
    log.error('Failed to record anon access log — rolling back transaction', {
      error: err,
      action,
    });
    throw err;
  }
}
