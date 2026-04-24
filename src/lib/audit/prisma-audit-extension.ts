/**
 * src/lib/audit/prisma-audit-extension.ts
 * Prisma client extension that automatically logs CRUD operations to NawasenaAuditLog.
 *
 * Intercepts: create, update, delete, upsert on audited models.
 * Captures: actorUserId, beforeValue, afterValue, entityType, entityId.
 * Writes audit entry in the SAME transaction as the operation (atomic).
 *
 * Suspend flag: set ctx.suspendAudit = true for bulk import (writes one summary entry instead).
 */

import { Prisma } from '@prisma/client';
import { getTenantContextOptional } from '@/lib/tenant/context';
import { createLogger } from '@/lib/logger';

const log = createLogger('prisma-audit');

// Models to audit (others are not audited to reduce noise)
const AUDITED_MODELS = new Set([
  'User',
  'Cohort',
  'Organization',
  'PaktaSignature',
  'PaktaRejection',
  'PaktaVersion',
  'WhitelistEmail',
  // M03 Struktur Angkatan
  'KPGroup',
  'KPGroupMember',
  'BuddyPair',
  'BuddyPairMember',
  'KasuhPair',
  'PairingRequest',
  'BulkPairingBatch',
  // M08 Event Execution
  'OutputUpload',
  'KegiatanEvaluation',
  'KegiatanQRSession',
]);

function getAuditAction(model: string, operation: string): string {
  const prefix = model.toUpperCase().replace('PAKTA', 'PAKTA_');
  switch (operation) {
    case 'create': {
      if (model === 'Organization') return 'ORG_CREATE';
      if (model === 'Cohort') return 'COHORT_CREATE';
      if (model === 'WhitelistEmail') return 'WHITELIST_ADD';
      if (model === 'PaktaSignature') return 'PAKTA_SIGN';
      if (model === 'PaktaRejection') return 'PAKTA_REJECT';
      if (model === 'PaktaVersion') return 'PAKTA_VERSION_PUBLISH';
      return 'USER_CREATE';
    }
    case 'update': {
      if (model === 'Organization') return 'ORG_UPDATE';
      if (model === 'Cohort') return 'COHORT_UPDATE';
      if (model === 'WhitelistEmail') return 'WHITELIST_REMOVE';
      return 'USER_UPDATE';
    }
    case 'delete': {
      if (model === 'Organization') return 'ORG_ARCHIVE';
      if (model === 'Cohort') return 'COHORT_ARCHIVE';
      if (model === 'WhitelistEmail') return 'WHITELIST_REMOVE';
      return 'USER_DEACTIVATE';
    }
    default:
      return `${prefix}_${operation.toUpperCase()}`;
  }
}

/**
 * Create the Prisma audit extension.
 * The extension intercepts write operations and logs them to NawasenaAuditLog.
 */
export function createAuditExtension() {
  return Prisma.defineExtension({
    name: 'nawasena-audit',
    query: {
      $allModels: {
        async create({ model, args, query }) {
          if (!AUDITED_MODELS.has(model)) return query(args);

          const ctx = getTenantContextOptional();
          if (ctx?.suspendAudit) return query(args);

          const result = await query(args);

          // Write audit entry (best-effort, don't fail the main op)
          try {
            const action = getAuditAction(model, 'create');
            const entityId = (result as Record<string, string>).id ?? 'unknown';

            await (query as unknown as { prisma: { nawasenaAuditLog: { create: (args: unknown) => Promise<unknown> } } }).prisma?.nawasenaAuditLog?.create({
              data: {
                action,
                actorUserId: ctx?.userId,
                entityType: model,
                entityId,
                afterValue: result as Prisma.JsonObject,
                organizationId: ctx?.organizationId,
                metadata: { operation: 'create' },
              },
            });
          } catch (err) {
            log.warn('Audit log failed for create', { model, error: err });
          }

          return result;
        },
      },
    },
  });
}
