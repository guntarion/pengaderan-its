/**
 * src/lib/passport/skem-export.service.ts
 * NAWASENA M05 — SKEM CSV generation service.
 *
 * generatePreview(cohortId, filter, limit=20) → JSON rows for UI preview
 * streamSkemCsv(cohortId, filter)            → full CSV string
 */

import { prisma } from '@/utils/prisma';
import { PassportEntryStatus } from '@prisma/client';
import { createLogger } from '@/lib/logger';
import {
  SKEM_COLUMNS,
  SKEM_DELIMITER,
  UTF8_BOM,
  formatDateForSkem,
  escapeCsvCell,
} from './skem-config';
import crypto from 'crypto';

const log = createLogger('passport:skem-export');

export interface SkemExportFilter {
  kpGroupId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  dimensi?: string;
}

export interface SkemExportRow {
  nrp: string | null;
  userName: string;
  itemDescription: string;
  skemCategory: string | null;
  skemPoints: number | null;
  verifiedAt: string;
  verifierName: string;
  dimensi: string;
}

interface FullEntry {
  user: { nrp: string | null; fullName: string };
  item: {
    description: string;
    skemCategory: string | null;
    skemPoints: number | null;
    dimensi: string;
  };
  verifier: { fullName: string } | null;
  verifiedAt: Date | null;
}

/**
 * Fetch SKEM-eligible entries for a cohort.
 */
async function fetchSkemEntries(
  cohortId: string,
  filter: SkemExportFilter,
  limit?: number,
): Promise<FullEntry[]> {
  return (await prisma.passportEntry.findMany({
    where: {
      cohortId,
      status: PassportEntryStatus.VERIFIED,
      item: {
        skemPoints: { not: null },
        ...(filter.dimensi ? { dimensi: filter.dimensi as never } : {}),
      },
      ...(filter.dateFrom || filter.dateTo
        ? {
            verifiedAt: {
              ...(filter.dateFrom ? { gte: filter.dateFrom } : {}),
              ...(filter.dateTo ? { lte: filter.dateTo } : {}),
            },
          }
        : {}),
    },
    include: {
      user: { select: { nrp: true, fullName: true } },
      item: {
        select: { description: true, skemCategory: true, skemPoints: true, dimensi: true },
      },
      verifier: { select: { fullName: true } },
    },
    orderBy: [{ user: { nrp: 'asc' } }, { verifiedAt: 'asc' }],
    ...(limit ? { take: limit } : {}),
  })) as unknown as FullEntry[];
}

/**
 * Convert entry to row data.
 */
function toSkemRow(entry: FullEntry): SkemExportRow {
  return {
    nrp: entry.user.nrp,
    userName: entry.user.fullName,
    itemDescription: entry.item.description,
    skemCategory: entry.item.skemCategory,
    skemPoints: entry.item.skemPoints,
    verifiedAt: entry.verifiedAt ? formatDateForSkem(entry.verifiedAt) : '-',
    verifierName: entry.verifier?.fullName ?? 'Auto-verified',
    dimensi: entry.item.dimensi,
  };
}

/**
 * Generate preview rows (for UI table, default 20).
 */
export async function generatePreview(
  cohortId: string,
  filter: SkemExportFilter = {},
  limit = 20,
): Promise<SkemExportRow[]> {
  log.debug('Generating SKEM preview', { cohortId, limit });
  const entries = await fetchSkemEntries(cohortId, filter, limit);
  return entries.map(toSkemRow);
}

/**
 * Generate full SKEM CSV string.
 *
 * @returns { csv: string, rowCount: number, checksumSha256: string }
 */
export async function generateSkemCsv(
  cohortId: string,
  filter: SkemExportFilter = {},
): Promise<{ csv: string; rowCount: number; checksumSha256: string }> {
  log.info('Generating SKEM CSV', { cohortId, filter });

  const entries = await fetchSkemEntries(cohortId, filter);
  const rows = entries.map(toSkemRow);

  // Build CSV
  const headerRow = SKEM_COLUMNS.map((col) => escapeCsvCell(col.header)).join(SKEM_DELIMITER);
  const dataRows = rows.map((row) => {
    return SKEM_COLUMNS.map((col) => {
      const value = (row as unknown as Record<string, unknown>)[col.field];
      return escapeCsvCell(value as string | number | null);
    }).join(SKEM_DELIMITER);
  });

  const csv = UTF8_BOM + [headerRow, ...dataRows].join('\n');
  const checksumSha256 = crypto.createHash('sha256').update(csv, 'utf8').digest('hex');

  log.info('SKEM CSV generated', { cohortId, rowCount: rows.length });

  return { csv, rowCount: rows.length, checksumSha256 };
}
