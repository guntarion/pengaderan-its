/**
 * src/lib/safeguard/serializer.ts
 * NAWASENA M10 — Incident serializer with field visibility per viewer role.
 *
 * Privacy rules:
 * - Affected user name/details: SC, Safeguard Officer, Pembina only
 * - Attachment keys (download access): SC, Safeguard Officer, reporter only
 * - resolutionNote: SC, Safeguard Officer, Pembina
 * - escalation details: SC, Safeguard Officer, Pembina
 * - Maba (non-reporter) gets nothing — 403 at API level
 */

import { UserRole } from '@prisma/client';
import { RETRACTION_WINDOW_MS } from './state-machine';

// Prisma SafeguardIncident with optional user include
export interface IncidentWithRelations {
  id: string;
  organizationId: string;
  cohortId: string;
  kpGroupId: string | null;
  type: string;
  severity: string;
  status: string;
  occurredAt: Date;
  createdAt: Date;
  updatedAt: Date;
  actionTaken: string | null;
  affectedUserId: string | null;
  additionalAffectedUserIds: string[];
  reportedById: string;
  claimedById: string | null;
  claimedAt: Date | null;
  resolvedById: string | null;
  resolvedAt: Date | null;
  resolutionNote: string | null;
  escalatedTo: string | null;
  escalatedById: string | null;
  escalatedAt: Date | null;
  escalationReason: string | null;
  satgasTicketRef: string | null;
  satgasPdfKey: string | null;
  attachmentKeys: string[];
  retractedAt: Date | null;
  retractedById: string | null;
  retractionReason: string | null;
  pembinaAnnotations: unknown;
  notes: unknown;
  // Optional joined relations
  reportedBy?: { id: string; displayName: string | null; fullName: string } | null;
  affectedUser?: { id: string; displayName: string | null; fullName: string } | null;
  claimedBy?: { id: string; displayName: string | null; fullName: string } | null;
}

export interface ViewerContext {
  id: string;
  role: UserRole;
  isSafeguardOfficer: boolean;
}

function isSCOrOfficer(viewer: ViewerContext): boolean {
  return viewer.role === UserRole.SC || viewer.isSafeguardOfficer;
}

function isPrivileged(viewer: ViewerContext): boolean {
  return (
    viewer.role === UserRole.SC ||
    viewer.isSafeguardOfficer ||
    viewer.role === UserRole.PEMBINA
  );
}

/**
 * Serialize a SafeguardIncident for a specific viewer.
 * Returns filtered fields based on role.
 */
export function serializeIncidentForViewer(
  incident: IncidentWithRelations,
  viewer: ViewerContext,
) {
  const isReporter = viewer.id === incident.reportedById;
  const ageMs = Date.now() - incident.createdAt.getTime();
  const canRetract =
    isReporter &&
    ageMs <= RETRACTION_WINDOW_MS &&
    (incident.status === 'OPEN' || incident.status === 'IN_REVIEW');

  // Base fields visible to anyone with list access
  const base = {
    id: incident.id,
    organizationId: incident.organizationId,
    cohortId: incident.cohortId,
    kpGroupId: incident.kpGroupId,
    type: incident.type,
    severity: incident.severity,
    status: incident.status,
    occurredAt: incident.occurredAt.toISOString(),
    createdAt: incident.createdAt.toISOString(),
    updatedAt: incident.updatedAt.toISOString(),
    actionTaken: incident.actionTaken,
    reportedById: incident.reportedById,
    reportedByName: incident.reportedBy
      ? (incident.reportedBy.displayName ?? incident.reportedBy.fullName)
      : null,
    claimedById: incident.claimedById,
    claimedByName: incident.claimedBy
      ? (incident.claimedBy.displayName ?? incident.claimedBy.fullName)
      : null,
    claimedAt: incident.claimedAt?.toISOString() ?? null,
    canRetract,
  };

  // Privileged fields (SC, Safeguard Officer, Pembina)
  const privilegedFields = isPrivileged(viewer)
    ? {
        affectedUserId: incident.affectedUserId,
        affectedUserName: incident.affectedUser
          ? (incident.affectedUser.displayName ?? incident.affectedUser.fullName)
          : null,
        additionalAffectedUserIds: incident.additionalAffectedUserIds,
        resolvedById: incident.resolvedById,
        resolvedAt: incident.resolvedAt?.toISOString() ?? null,
        resolutionNote: incident.resolutionNote,
        escalatedTo: incident.escalatedTo,
        escalatedById: incident.escalatedById,
        escalatedAt: incident.escalatedAt?.toISOString() ?? null,
        escalationReason: incident.escalationReason,
        satgasTicketRef: incident.satgasTicketRef,
        satgasPdfKey: incident.satgasPdfKey,
        retractedAt: incident.retractedAt?.toISOString() ?? null,
        retractedById: incident.retractedById,
        retractionReason: incident.retractionReason,
        pembinaAnnotations: incident.pembinaAnnotations,
        notes: isPrivileged(viewer) ? incident.notes : undefined,
      }
    : {};

  // Attachment keys: SC + Safeguard Officer can see + download; Pembina sees metadata only
  const attachmentFields =
    isSCOrOfficer(viewer) || isReporter
      ? { attachmentKeys: incident.attachmentKeys }
      : isPrivileged(viewer)
        ? { attachmentCount: incident.attachmentKeys.length } // Pembina sees count only
        : {};

  return { ...base, ...privilegedFields, ...attachmentFields };
}

export type SerializedIncidentForViewer = ReturnType<typeof serializeIncidentForViewer>;
