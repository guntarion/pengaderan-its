/**
 * src/lib/safeguard/satgas-export.ts
 * NAWASENA M10 — Generate and store Satgas escalation PDF.
 *
 * Flow:
 *   1. Fetch full incident + timeline + relations from DB
 *   2. Render SatgasPdfReport to buffer using @react-pdf/renderer
 *   3. Upload buffer to S3 at safeguard/satgas-pdfs/{incidentId}/{timestamp}.pdf
 *   4. Update incident.satgasPdfKey
 *   5. Return presigned GET URL (TTL 7 days)
 *
 * Note: renderToBuffer is server-only; do NOT import this in client components.
 */

import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import type { ReactElement } from 'react';
import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { issueGetUrl } from '@/lib/storage/presigned-download';
import { getS3Client, getSpacesBucket } from '@/lib/storage/s3-client';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { SatgasPdfReport } from '@/components/safeguard/SatgasPdfReport';
import type { SatgasPdfData } from '@/components/safeguard/SatgasPdfReport';
import type { DocumentProps } from '@react-pdf/renderer';
import { NotFoundError } from '@/lib/api';

const log = createLogger('satgas-export');

const PDF_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface SatgasPdfResult {
  s3Key: string;
  url: string;
  expiresAt: Date;
}

/**
 * Generate a Satgas escalation PDF for an incident, store to S3,
 * update incident.satgasPdfKey, and return a presigned download URL.
 *
 * @param incidentId   - Incident to generate PDF for
 * @param downloaderId - User requesting the PDF (for watermark)
 * @param downloaderName - Visible name for watermark
 */
export async function generateSatgasPdf(
  incidentId: string,
  downloaderId: string,
  downloaderName: string,
): Promise<SatgasPdfResult> {
  log.info('Starting Satgas PDF generation', { incidentId, downloaderId });

  // 1. Fetch incident with full relations
  const incident = await prisma.safeguardIncident.findUnique({
    where: { id: incidentId },
    include: {
      reportedBy: { select: { id: true, displayName: true, fullName: true } },
      affectedUser: { select: { id: true, displayName: true, fullName: true } },
      claimedBy: { select: { id: true, displayName: true, fullName: true } },
    },
  });

  if (!incident) throw NotFoundError('Incident');

  // 2. Fetch timeline
  const timelineEntries = await prisma.incidentTimelineEntry.findMany({
    where: { incidentId },
    orderBy: { createdAt: 'asc' },
    include: {
      actor: { select: { id: true, displayName: true, fullName: true } },
    },
  });

  // 3. Fetch org + cohort names
  const org = await prisma.organization.findUnique({
    where: { id: incident.organizationId },
    select: { name: true },
  });

  const cohort = await prisma.cohort.findUnique({
    where: { id: incident.cohortId },
    select: { name: true },
  }).catch(() => null);

  // 4. Build PDF data
  const pdfData: SatgasPdfData = {
    incidentId,
    incidentType: incident.type,
    incidentSeverity: incident.severity,
    incidentStatus: incident.status,
    occurredAt: incident.occurredAt.toISOString(),
    createdAt: incident.createdAt.toISOString(),
    reportedByName:
      incident.reportedBy?.displayName ?? incident.reportedBy?.fullName ?? 'N/A',
    affectedUserName:
      incident.affectedUser?.displayName ?? incident.affectedUser?.fullName ?? null,
    actionTaken: incident.actionTaken,
    escalationReason: incident.escalationReason ?? '',
    escalatedTo: incident.escalatedTo ?? 'N/A',
    satgasTicketRef: incident.satgasTicketRef,
    attachmentCount: incident.attachmentKeys.filter((k) => !k.startsWith('PENDING:')).length,
    organizationName: org?.name ?? incident.organizationId,
    cohortName: cohort?.name ?? null,
    downloaderName,
    downloadedAt: new Date().toISOString(),
    timeline: timelineEntries.map((e) => ({
      id: e.id,
      action: e.action,
      actorName: e.actor?.displayName ?? e.actor?.fullName ?? 'System',
      noteText: e.noteText ?? null,
      createdAt: e.createdAt.toISOString(),
    })),
  };

  // 5. Render PDF to buffer
  log.info('Rendering PDF', { incidentId, timelineCount: pdfData.timeline.length });

  const pdfBuffer = await renderToBuffer(
    React.createElement(SatgasPdfReport, { data: pdfData }) as ReactElement<DocumentProps>,
  );

  // 6. Upload to S3
  const timestamp = Date.now();
  const s3Key = `safeguard/satgas-pdfs/${incidentId}/${timestamp}.pdf`;
  const bucket = getSpacesBucket();
  const s3Client = getS3Client();

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
      ContentDisposition: `attachment; filename="satgas-${incidentId.slice(-8)}.pdf"`,
    }),
  );

  log.info('PDF uploaded to S3', { incidentId, s3Key, sizeBytes: pdfBuffer.length });

  // 7. Update incident.satgasPdfKey
  await prisma.safeguardIncident.update({
    where: { id: incidentId },
    data: { satgasPdfKey: s3Key },
  });

  // 8. Issue presigned GET URL (7 days TTL)
  const url = await issueGetUrl({
    key: s3Key,
    ttlSeconds: PDF_TTL_SECONDS,
    filename: `satgas-insiden-${incidentId.slice(-8)}.pdf`,
  });

  const expiresAt = new Date(Date.now() + PDF_TTL_SECONDS * 1000);

  log.info('Satgas PDF generation complete', { incidentId, s3Key, expiresAt });

  return { s3Key, url, expiresAt };
}

/**
 * Get (or refresh) the presigned URL for an existing Satgas PDF.
 * Does NOT re-generate the PDF; just re-signs the existing S3 key.
 */
export async function getSatgasPdfUrl(incidentId: string): Promise<SatgasPdfResult> {
  const incident = await prisma.safeguardIncident.findUnique({
    where: { id: incidentId },
    select: { satgasPdfKey: true },
  });

  if (!incident) throw NotFoundError('Incident');
  if (!incident.satgasPdfKey) {
    const err = new Error('No Satgas PDF generated yet for this incident') as NodeJS.ErrnoException;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const url = await issueGetUrl({
    key: incident.satgasPdfKey,
    ttlSeconds: PDF_TTL_SECONDS,
    filename: `satgas-insiden-${incidentId.slice(-8)}.pdf`,
  });

  const expiresAt = new Date(Date.now() + PDF_TTL_SECONDS * 1000);
  return { s3Key: incident.satgasPdfKey, url, expiresAt };
}
