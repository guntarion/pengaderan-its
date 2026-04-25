/**
 * src/lib/triwulan/generator/compliance-snapshot.ts
 * NAWASENA M14 — Compliance Snapshot sub-generator.
 *
 * Reads Organization.settings.permen55Checklist JSON + checks Satgas active flag.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';

const log = createLogger('m14/generator/compliance-snapshot');

export interface ComplianceItem {
  id: string;
  label: string;
  configured: boolean;
}

export interface ComplianceSnapshotData {
  permen55Items: ComplianceItem[];
  satgasActive: boolean;
}

export interface ComplianceSnapshotResult {
  data: ComplianceSnapshotData | null;
  missing?: string[];
}

export async function generateComplianceSnapshot(
  cohortId: string,
): Promise<ComplianceSnapshotResult> {
  try {
    log.info('Generating compliance snapshot', { cohortId });

    // Get organizationId from cohort
    const cohort = await prisma.cohort.findUnique({
      where: { id: cohortId },
      select: { organizationId: true },
    });

    if (!cohort) {
      return { data: null, missing: ['compliance'] };
    }

    // Read organization settings
    const org = await prisma.organization.findUnique({
      where: { id: cohort.organizationId },
      select: { settings: true },
    });

    // Check if there's an active Satgas officer in the org
    const satgasCount = await prisma.user.count({
      where: {
        organizationId: cohort.organizationId,
        isSafeguardOfficer: true,
        status: 'ACTIVE',
      },
    });

    const settings = (org?.settings as Record<string, unknown>) ?? {};
    const checklist = (settings.permen55Checklist as ComplianceItem[]) ?? [];

    // Default checklist if not configured
    const defaultItems: ComplianceItem[] = [
      { id: 'sop-kekerasan', label: 'SOP Penanganan Kekerasan', configured: false },
      { id: 'satgas-aktif', label: 'Satgas PPKPT Aktif', configured: satgasCount > 0 },
      { id: 'kanal-pengaduan', label: 'Kanal Pengaduan Tersedia', configured: false },
      { id: 'sosialisasi-done', label: 'Sosialisasi Permen 55 Dilakukan', configured: false },
    ];

    const permen55Items = checklist.length > 0 ? checklist : defaultItems;

    const data: ComplianceSnapshotData = {
      permen55Items,
      satgasActive: satgasCount > 0,
    };

    log.info('Compliance snapshot generated', { cohortId, satgasCount });
    return { data };
  } catch (err) {
    log.error('Compliance snapshot failed', { error: err, cohortId });
    return { data: null, missing: ['compliance'] };
  }
}
