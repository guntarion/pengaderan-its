/**
 * src/lib/safeguard/incident-service.ts
 * NAWASENA M10 — Incident CRUD + state transition service.
 *
 * All mutations go through this service to ensure:
 * - Prisma transactions (incident update + timeline entry atomic)
 * - Audit logging
 * - State machine validation before DB writes
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import {
  IncidentStatus,
  EscalationTarget,
  AuditAction,
  Prisma,
} from '@prisma/client';
import { validateTransition } from './state-machine';
import {
  recordTimelineEntry,
  makeCreatedEntry,
  makeClaimedEntry,
  makeStatusChangedEntry,
  makeNoteAddedEntry,
  makeFieldUpdatedEntry,
  makeEscalatedEntry,
  makeRetractedByReporterEntry,
  makeRetractedBySCEntry,
  makeResolvedEntry,
  makeReopenedEntry,
  makeSupersededEntry,
} from './timeline';
import {
  IncidentActor,
  TransitionPayload,
} from './types';
import type { CreateIncidentInput as CreateIncidentInputRaw, UpdateIncidentInput } from './schemas';
import { escalateIncident } from './escalation';

// Allow additionalAffectedUserIds to be optional at service input level (defaults to [])
export type CreateIncidentInput = Omit<CreateIncidentInputRaw, 'additionalAffectedUserIds'> & {
  additionalAffectedUserIds?: string[];
};

const log = createLogger('incident-service');

// ---- Internal audit log helper for M10-specific actions ----

async function recordM10AuditLog(params: {
  action: AuditAction;
  actorUserId: string;
  organizationId: string;
  entityId: string;
  beforeValue?: Record<string, unknown>;
  afterValue?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.nawasenaAuditLog.create({
      data: {
        action: params.action,
        actorUserId: params.actorUserId,
        organizationId: params.organizationId,
        entityType: 'SafeguardIncident',
        entityId: params.entityId,
        beforeValue: params.beforeValue ? (params.beforeValue as unknown as Prisma.InputJsonValue) : undefined,
        afterValue: params.afterValue ? (params.afterValue as unknown as Prisma.InputJsonValue) : undefined,
        metadata: params.metadata ? (params.metadata as unknown as Prisma.InputJsonValue) : undefined,
      },
    });
  } catch (err) {
    log.error('Failed to write M10 audit log', { error: err, action: params.action });
  }
}

// ---- Incident include for full data ----

export const INCIDENT_WITH_RELATIONS = {
  reportedBy: { select: { id: true, displayName: true, fullName: true } },
  affectedUser: { select: { id: true, displayName: true, fullName: true } },
  claimedBy: { select: { id: true, displayName: true, fullName: true } },
} as const;

// ---- Create ----

export async function createIncident(
  input: CreateIncidentInput,
  actor: IncidentActor,
  meta?: { ipAddress?: string; userAgent?: string },
) {
  log.info('Creating incident', {
    type: input.type,
    severity: input.severity,
    actorId: actor.id,
    cohortId: input.cohortId,
  });

  const incident = await prisma.$transaction(async (tx) => {
    const created = await tx.safeguardIncident.create({
      data: {
        organizationId: actor.organizationId,
        cohortId: input.cohortId,
        kpGroupId: input.kpGroupId,
        type: input.type,
        severity: input.severity,
        status: IncidentStatus.OPEN,
        occurredAt: new Date(input.occurredAt),
        actionTaken: input.actionTaken,
        affectedUserId: input.affectedUserId,
        additionalAffectedUserIds: input.additionalAffectedUserIds ?? [],
        reportedById: actor.id,
        notes: (input.notes ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
    });

    await recordTimelineEntry(
      tx,
      makeCreatedEntry({
        organizationId: actor.organizationId,
        incidentId: created.id,
        actorId: actor.id,
        newValue: {
          type: created.type,
          severity: created.severity,
          status: created.status,
        },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      }),
    );

    return created;
  });

  // Audit log
  await recordM10AuditLog({
    action: AuditAction.INCIDENT_CREATE,
    actorUserId: actor.id,
    organizationId: actor.organizationId,
    entityId: incident.id,
    afterValue: { type: incident.type, severity: incident.severity },
    metadata: { ipAddress: meta?.ipAddress },
  });

  log.info('Incident created', { id: incident.id, type: incident.type, severity: incident.severity });

  // Non-blocking escalation — run after-commit via Promise.allSettled (does not delay response)
  Promise.allSettled([escalateIncident(incident.id)]).then(([result]) => {
    if (result.status === 'rejected') {
      log.error('escalateIncident threw unexpectedly', { incidentId: incident.id, error: result.reason });
    }
  });

  return incident;
}

// ---- Update fields (PATCH) ----

export async function updateIncidentFields(
  incidentId: string,
  patch: UpdateIncidentInput,
  actor: IncidentActor,
  meta?: { ipAddress?: string; userAgent?: string },
) {
  log.info('Updating incident fields', { incidentId, actorId: actor.id });

  const incident = await prisma.safeguardIncident.findUnique({
    where: { id: incidentId },
  });

  if (!incident) {
    throw new Error(`Incident not found: ${incidentId}`);
  }

  if (incident.organizationId !== actor.organizationId) {
    throw new Error('Cross-org access denied');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.safeguardIncident.update({
      where: { id: incidentId },
      data: {
        actionTaken: patch.actionTaken ?? undefined,
        affectedUserId:
          patch.affectedUserId !== undefined ? patch.affectedUserId : undefined,
        additionalAffectedUserIds: patch.additionalAffectedUserIds ?? undefined,
        kpGroupId:
          patch.kpGroupId !== undefined ? patch.kpGroupId : undefined,
        notes:
          patch.notes !== undefined
            ? (patch.notes as Prisma.InputJsonValue)
            : undefined,
      },
    });

    // Record what changed
    const changedFields = Object.keys(patch).filter(
      (k) => patch[k as keyof typeof patch] !== undefined,
    );

    if (changedFields.length > 0) {
      await recordTimelineEntry(
        tx,
        makeFieldUpdatedEntry({
          organizationId: actor.organizationId,
          incidentId,
          actorId: actor.id,
          oldValue: Object.fromEntries(
            changedFields.map((f) => [f, incident[f as keyof typeof incident]]),
          ),
          newValue: Object.fromEntries(
            changedFields.map((f) => [f, patch[f as keyof typeof patch]]),
          ),
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        }),
      );
    }

    return result;
  });

  await recordM10AuditLog({
    action: AuditAction.INCIDENT_UPDATE,
    actorUserId: actor.id,
    organizationId: actor.organizationId,
    entityId: incidentId,
    beforeValue: Object.fromEntries(
      Object.keys(patch).map((k) => [k, incident[k as keyof typeof incident]]),
    ),
    afterValue: patch as Record<string, unknown>,
  });

  return updated;
}

// ---- Transition status ----

export async function transitionStatus(
  incidentId: string,
  targetStatus: IncidentStatus,
  actor: IncidentActor,
  payload: TransitionPayload,
  meta?: { ipAddress?: string; userAgent?: string },
) {
  log.info('Transitioning incident status', {
    incidentId,
    targetStatus,
    actorId: actor.id,
    payloadType: payload.type,
  });

  // Fetch with lock-compatible query
  const incident = await prisma.safeguardIncident.findUnique({
    where: { id: incidentId },
  });

  if (!incident) {
    throw new Error(`Incident not found: ${incidentId}`);
  }

  if (incident.organizationId !== actor.organizationId) {
    throw new Error('Cross-org access denied');
  }

  // Validate transition
  const validation = validateTransition(
    {
      status: incident.status,
      reportedById: incident.reportedById,
      claimedById: incident.claimedById,
      createdAt: incident.createdAt,
    },
    targetStatus,
    actor,
    payload,
  );

  if (!validation.valid) {
    const error = new Error(validation.errors[0]);
    (error as NodeJS.ErrnoException).code = 'INVALID_TRANSITION';
    throw error;
  }

  // Build update data per target status
  const now = new Date();
  const updateData: Record<string, unknown> = { status: targetStatus };

  if (targetStatus === IncidentStatus.IN_REVIEW && incident.status === IncidentStatus.OPEN) {
    // CLAIM
    updateData.claimedById = actor.id;
    updateData.claimedAt = now;
  } else if (targetStatus === IncidentStatus.RESOLVED) {
    // RESOLVE
    updateData.resolvedById = actor.id;
    updateData.resolvedAt = now;
    updateData.resolutionNote = (payload as { resolutionNote: string }).resolutionNote;
  } else if (
    targetStatus === IncidentStatus.RETRACTED_BY_REPORTER ||
    targetStatus === IncidentStatus.RETRACTED_BY_SC
  ) {
    // RETRACT
    updateData.retractedAt = now;
    updateData.retractedById = actor.id;
    updateData.retractionReason = (payload as { reason: string }).reason;
  } else if (targetStatus === IncidentStatus.ESCALATED_TO_SATGAS) {
    const p = payload as { escalationReason: string; escalatedTo: EscalationTarget; satgasTicketRef?: string };
    updateData.escalatedById = actor.id;
    updateData.escalatedAt = now;
    updateData.escalationReason = p.escalationReason;
    updateData.escalatedTo = p.escalatedTo;
    updateData.satgasTicketRef = p.satgasTicketRef;
  }

  // Atomic update + timeline
  const updated = await prisma.$transaction(async (tx) => {
    // Optimistic locking: check status hasn't changed (for CLAIM race condition)
    const locked = await tx.safeguardIncident.updateMany({
      where: { id: incidentId, status: incident.status },
      data: updateData,
    });

    if (locked.count === 0) {
      const conflict = new Error(
        'Incident status changed concurrently. Please refresh and try again.',
      );
      (conflict as NodeJS.ErrnoException).code = 'CONFLICT';
      throw conflict;
    }

    // Record timeline entry
    const timelineParams = {
      organizationId: actor.organizationId,
      incidentId,
      actorId: actor.id,
      oldValue: { status: incident.status },
      newValue: { status: targetStatus, ...updateData },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    };

    switch (targetStatus) {
      case IncidentStatus.IN_REVIEW:
        if (incident.status === IncidentStatus.OPEN) {
          await recordTimelineEntry(tx, makeClaimedEntry(timelineParams));
        } else {
          await recordTimelineEntry(tx, makeReopenedEntry(timelineParams));
        }
        break;
      case IncidentStatus.RESOLVED:
        await recordTimelineEntry(tx, makeResolvedEntry({
          ...timelineParams,
          noteText: (payload as { resolutionNote: string }).resolutionNote,
        }));
        break;
      case IncidentStatus.ESCALATED_TO_SATGAS:
        await recordTimelineEntry(tx, makeEscalatedEntry({
          ...timelineParams,
          noteText: (payload as { escalationReason: string }).escalationReason,
        }));
        break;
      case IncidentStatus.RETRACTED_BY_REPORTER:
        await recordTimelineEntry(tx, makeRetractedByReporterEntry({
          ...timelineParams,
          noteText: (payload as { reason: string }).reason,
        }));
        break;
      case IncidentStatus.RETRACTED_BY_SC:
        await recordTimelineEntry(tx, makeRetractedBySCEntry({
          ...timelineParams,
          noteText: (payload as { reason: string }).reason,
        }));
        break;
      case IncidentStatus.SUPERSEDED:
        await recordTimelineEntry(tx, makeSupersededEntry(timelineParams));
        break;
      default:
        await recordTimelineEntry(tx, makeStatusChangedEntry(timelineParams));
    }

    return tx.safeguardIncident.findUniqueOrThrow({ where: { id: incidentId } });
  });

  await recordM10AuditLog({
    action: AuditAction.INCIDENT_STATUS_CHANGE,
    actorUserId: actor.id,
    organizationId: actor.organizationId,
    entityId: incidentId,
    beforeValue: { status: incident.status },
    afterValue: { status: targetStatus },
    metadata: { payloadType: payload.type, ipAddress: meta?.ipAddress },
  });

  log.info('Incident status transitioned', {
    incidentId,
    from: incident.status,
    to: targetStatus,
  });

  return updated;
}

// ---- Add note ----

export async function addIncidentNote(
  incidentId: string,
  noteText: string,
  actor: IncidentActor,
  meta?: { ipAddress?: string; userAgent?: string },
) {
  log.info('Adding note to incident', { incidentId, actorId: actor.id });

  const incident = await prisma.safeguardIncident.findUnique({
    where: { id: incidentId },
  });

  if (!incident) throw new Error(`Incident not found: ${incidentId}`);
  if (incident.organizationId !== actor.organizationId) throw new Error('Cross-org access denied');

  await recordTimelineEntry(
    prisma,
    makeNoteAddedEntry({
      organizationId: actor.organizationId,
      incidentId,
      actorId: actor.id,
      noteText,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    }),
  );

  await recordM10AuditLog({
    action: AuditAction.INCIDENT_NOTE_ADD,
    actorUserId: actor.id,
    organizationId: actor.organizationId,
    entityId: incidentId,
  });

  log.info('Note added to incident', { incidentId });
}

// ---- Add Pembina annotation ----

export async function addPembinaAnnotation(
  incidentId: string,
  noteText: string,
  actor: IncidentActor,
  meta?: { ipAddress?: string; userAgent?: string },
) {
  log.info('Adding Pembina annotation', { incidentId, actorId: actor.id });

  const incident = await prisma.safeguardIncident.findUnique({
    where: { id: incidentId },
  });

  if (!incident) throw new Error(`Incident not found: ${incidentId}`);
  if (incident.organizationId !== actor.organizationId) throw new Error('Cross-org access denied');

  const now = new Date();
  const existingAnnotations = Array.isArray(incident.pembinaAnnotations)
    ? (incident.pembinaAnnotations as unknown[])
    : [];

  await prisma.$transaction(async (tx) => {
    await tx.safeguardIncident.update({
      where: { id: incidentId },
      data: {
        pembinaAnnotations: [
          ...existingAnnotations,
          { pembinaId: actor.id, note: noteText, createdAt: now.toISOString() },
        ] as Prisma.InputJsonValue,
      },
    });

    await recordTimelineEntry(
      tx,
      {
        organizationId: actor.organizationId,
        incidentId,
        actorId: actor.id,
        action: 'PEMBINA_ANNOTATION_ADDED' as const,
        noteText,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      },
    );
  });

  await recordM10AuditLog({
    action: AuditAction.PEMBINA_ANNOTATION_ADD,
    actorUserId: actor.id,
    organizationId: actor.organizationId,
    entityId: incidentId,
  });

  log.info('Pembina annotation added', { incidentId });
}
