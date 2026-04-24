/**
 * src/lib/safeguard/consequences/assign.ts
 * NAWASENA M10 — Create (assign) a ConsequenceLog for a target user.
 *
 * Only non-physical consequence types are permitted per Permen 55/2024.
 * POIN_PASSPORT_DIKURANGI is restricted to SC + Safeguard Officers.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import {
  ConsequenceType,
  ConsequenceStatus,
  PassportCascadeStatus,
  TimelineAction,
  AuditAction,
  Prisma,
} from '@prisma/client';
import type { IncidentActor } from '../types';
import { triggerPassportCascade } from './passport-cascade';

const log = createLogger('safeguard:consequences:assign');

// The only permitted consequence types per Permen 55/2024 (non-physical, non-verbal, non-psychological)
const ALLOWED_CONSEQUENCE_TYPES: ConsequenceType[] = [
  ConsequenceType.REFLEKSI_500_KATA,
  ConsequenceType.PRESENTASI_ULANG,
  ConsequenceType.POIN_PASSPORT_DIKURANGI,
  ConsequenceType.PERINGATAN_TERTULIS,
  ConsequenceType.TUGAS_PENGABDIAN,
];

// Types that require deadline
const REQUIRES_DEADLINE: ConsequenceType[] = [
  ConsequenceType.REFLEKSI_500_KATA,
  ConsequenceType.PRESENTASI_ULANG,
  ConsequenceType.TUGAS_PENGABDIAN,
];

export interface CreateConsequenceLogInput {
  organizationId: string;
  cohortId: string;
  targetUserId: string;
  type: ConsequenceType;
  reasonText: string;
  relatedIncidentId?: string;
  deadline?: Date;
  pointsDeducted?: number;
  forbiddenActCode?: string;
}

/**
 * Assign a pedagogical consequence to a target user.
 *
 * Enforces:
 * - Only the 5 non-physical consequence types from Permen 55/2024
 * - POIN_PASSPORT_DIKURANGI only by SC + isSafeguardOfficer
 * - Target user must not be DEACTIVATED
 * - Timeline entry CONSEQUENCE_ASSIGNED on related incident (if linked)
 * - Triggers passport cascade for POIN_PASSPORT_DIKURANGI
 * - Sends M15 notification CONSEQUENCE_ASSIGNED_MABA (fail-silently)
 *
 * @throws Error with code 'FORBIDDEN' if actor lacks permission
 * @throws Error with code 'VALIDATION_ERROR' if payload is invalid
 * @throws Error with code 'TARGET_DEACTIVATED' if target user is inactive
 */
export async function createConsequenceLog(
  input: CreateConsequenceLogInput,
  actor: IncidentActor,
  meta?: { ipAddress?: string; userAgent?: string },
) {
  log.info('Creating consequence log', {
    type: input.type,
    targetUserId: input.targetUserId,
    actorId: actor.id,
    relatedIncidentId: input.relatedIncidentId,
  });

  // ---- Validation: only allowed types ----
  if (!ALLOWED_CONSEQUENCE_TYPES.includes(input.type)) {
    const err = new Error(`Tipe konsekuensi tidak diizinkan: ${input.type}. Hanya tipe non-fisik yang diperbolehkan.`);
    (err as NodeJS.ErrnoException).code = 'VALIDATION_ERROR';
    throw err;
  }

  // ---- Role check: POIN_PASSPORT_DIKURANGI only SC + Safeguard Officer ----
  if (input.type === ConsequenceType.POIN_PASSPORT_DIKURANGI) {
    const isAllowed = actor.role === 'SC' || actor.isSafeguardOfficer;
    if (!isAllowed) {
      const err = new Error('Hanya SC atau Safeguard Officer yang dapat mengurangi poin Passport.');
      (err as NodeJS.ErrnoException).code = 'FORBIDDEN';
      throw err;
    }
    if (!input.pointsDeducted || input.pointsDeducted <= 0) {
      const err = new Error('pointsDeducted harus diisi dan lebih dari 0 untuk POIN_PASSPORT_DIKURANGI.');
      (err as NodeJS.ErrnoException).code = 'VALIDATION_ERROR';
      throw err;
    }
  }

  // ---- Deadline required for certain types ----
  if (REQUIRES_DEADLINE.includes(input.type) && !input.deadline) {
    const err = new Error(`Deadline wajib diisi untuk tipe ${input.type}.`);
    (err as NodeJS.ErrnoException).code = 'VALIDATION_ERROR';
    throw err;
  }

  // ---- Validate reasonText ----
  if (!input.reasonText || input.reasonText.trim().length < 30) {
    const err = new Error('reasonText harus minimal 30 karakter.');
    (err as NodeJS.ErrnoException).code = 'VALIDATION_ERROR';
    throw err;
  }

  // ---- Validate target user is not deactivated ----
  const targetUser = await prisma.user.findUnique({
    where: { id: input.targetUserId },
    select: { id: true, fullName: true, email: true, status: true },
  });

  if (!targetUser) {
    const err = new Error(`Target user tidak ditemukan: ${input.targetUserId}`);
    (err as NodeJS.ErrnoException).code = 'NOT_FOUND';
    throw err;
  }

  if (targetUser.status === 'DEACTIVATED') {
    const err = new Error('Target user tidak aktif. Konsekuensi tidak dapat di-assign.');
    (err as NodeJS.ErrnoException).code = 'TARGET_DEACTIVATED';
    throw err;
  }

  // ---- Create consequence in transaction ----
  const consequence = await prisma.$transaction(async (tx) => {
    const passportCascadeStatus =
      input.type === ConsequenceType.POIN_PASSPORT_DIKURANGI
        ? PassportCascadeStatus.PENDING
        : PassportCascadeStatus.NOT_APPLICABLE;

    const created = await tx.consequenceLog.create({
      data: {
        organizationId: input.organizationId,
        cohortId: input.cohortId,
        userId: input.targetUserId,
        type: input.type,
        reasonText: input.reasonText.trim(),
        forbiddenActCode: input.forbiddenActCode,
        relatedIncidentId: input.relatedIncidentId,
        assignedById: actor.id,
        deadline: input.deadline,
        status: ConsequenceStatus.ASSIGNED,
        pointsDeducted: input.pointsDeducted,
        passportCascadeStatus,
      },
    });

    // ---- Timeline entry on related incident (if linked) ----
    if (input.relatedIncidentId) {
      await tx.incidentTimelineEntry.create({
        data: {
          organizationId: input.organizationId,
          incidentId: input.relatedIncidentId,
          actorId: actor.id,
          action: TimelineAction.CONSEQUENCE_ASSIGNED,
          newValue: {
            consequenceLogId: created.id,
            type: input.type,
            targetUserId: input.targetUserId,
          },
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        },
      });
    }

    return created;
  });

  // ---- Audit log ----
  try {
    await prisma.nawasenaAuditLog.create({
      data: {
        action: AuditAction.CONSEQUENCE_ASSIGN,
        actorUserId: actor.id,
        organizationId: input.organizationId,
        entityType: 'ConsequenceLog',
        entityId: consequence.id,
        afterValue: {
          type: input.type,
          targetUserId: input.targetUserId,
          relatedIncidentId: input.relatedIncidentId,
        } as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    log.error('Failed to write consequence audit log', { error: err });
  }

  // ---- Notify target maba via M15 (fail-silently) ----
  Promise.allSettled([
    (async () => {
      try {
        const { sendNotification } = await import('@/lib/notifications/send');
        await sendNotification({
          userId: input.targetUserId,
          templateKey: 'CONSEQUENCE_ASSIGNED_MABA',
          payload: {
            consequenceType: input.type,
            reasonText: input.reasonText,
            deadline: input.deadline?.toISOString(),
            konsekuensiUrl: `/dashboard/konsekuensi/${consequence.id}`,
          },
          category: 'NORMAL',
          requestId: `m10-consequence-assign-${consequence.id}`,
        });
      } catch (err) {
        log.warn('Failed to notify maba about consequence assignment', {
          consequenceId: consequence.id,
          targetUserId: input.targetUserId,
          error: err,
        });
      }
    })(),
  ]);

  // ---- Trigger passport cascade for POIN_PASSPORT_DIKURANGI ----
  if (input.type === ConsequenceType.POIN_PASSPORT_DIKURANGI) {
    Promise.allSettled([triggerPassportCascade(consequence.id)]).then(([result]) => {
      if (result.status === 'rejected') {
        log.error('triggerPassportCascade threw unexpectedly', {
          consequenceId: consequence.id,
          error: result.reason,
        });
      }
    });
  }

  log.info('Consequence log created', {
    id: consequence.id,
    type: consequence.type,
    targetUserId: input.targetUserId,
  });

  return consequence;
}
