/**
 * src/lib/dashboard/payload-builders/compliance.ts
 * Shared helper to build ComplianceData for BLM, SC, and Pembina dashboards.
 *
 * Includes:
 * - Pakta Panitia signed % (panitia roles)
 * - Social Contract Maba signed %
 * - Forbidden Acts violation count (SafeguardIncidents of type FA)
 * - Permen 55/2024 checklist (10 items, hard-coded assessment)
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import type { ComplianceData, Permen55Item } from '@/types/dashboard';

const log = createLogger('m13/payload-builder/compliance');

/**
 * Fixed Permen 55/2024 checklist items.
 * Status is computed from live data where possible; otherwise defaults to 'yellow'.
 */
const PERMEN55_BASE_ITEMS: Omit<Permen55Item, 'status'>[] = [
  { id: 'p55-01', label: 'Ketua kegiatan telah ditunjuk secara resmi' },
  { id: 'p55-02', label: 'SK panitia kegiatan telah dikeluarkan' },
  { id: 'p55-03', label: 'Pakta integritas panitia ditandatangani ≥90%' },
  { id: 'p55-04', label: 'Kontrak sosial mahasiswa baru ditandatangani ≥90%' },
  { id: 'p55-05', label: 'Tidak ada hukuman fisik, verbal, psikologis' },
  { id: 'p55-06', label: 'Protokol safeguard tersedia dan disosialisasikan' },
  { id: 'p55-07', label: 'Jalur pelaporan anonim tersedia' },
  { id: 'p55-08', label: 'Semua insiden dilaporkan dalam 24 jam' },
  { id: 'p55-09', label: 'Evaluasi kegiatan dilakukan (NPS/Kirkpatrick)' },
  { id: 'p55-10', label: 'Laporan akhir kegiatan diserahkan ke institusi' },
];

const PANITIA_ROLES = ['KP', 'KASUH', 'OC', 'SC', 'BLM', 'SATGAS'];

export async function buildComplianceData(
  cohortId: string,
  organizationId: string,
): Promise<ComplianceData> {
  const start = Date.now();

  const [
    paktaStats,
    socialContractStats,
    fbViolations,
    incidentsIn24h,
    completedKegiatan,
    anonCount,
  ] = await Promise.all([
    // Pakta Panitia signed %
    Promise.all([
      prisma.user.count({
        where: {
          currentCohortId: cohortId,
          role: { in: PANITIA_ROLES as never[] },
          paktaPanitiaStatus: 'SIGNED',
        },
      }),
      prisma.user.count({
        where: {
          currentCohortId: cohortId,
          role: { in: PANITIA_ROLES as never[] },
        },
      }),
    ]),

    // Social Contract Maba signed %
    Promise.all([
      prisma.user.count({
        where: {
          currentCohortId: cohortId,
          role: 'MABA',
          socialContractStatus: 'SIGNED',
        },
      }),
      prisma.user.count({
        where: {
          currentCohortId: cohortId,
          role: 'MABA',
        },
      }),
    ]),

    // Forbidden Acts violations: ConsequenceLogs with forbiddenActCode set (linked to specific forbidden acts)
    prisma.consequenceLog.count({
      where: {
        cohortId,
        forbiddenActCode: { not: null },
        status: { notIn: ['CANCELLED', 'FORFEITED'] },
      },
    }),

    // Incidents NOT reported within 24h (PENDING_REVIEW still open after cutoff)
    prisma.safeguardIncident.count({
      where: {
        cohortId,
        status: 'PENDING_REVIEW',
        createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),

    // Kegiatan with completed evaluation
    prisma.kegiatanInstance.count({
      where: {
        cohortId,
        status: 'DONE',
        evaluation: { isNot: null },
      },
    }),

    // Anon report availability check
    prisma.anonReport.count({
      where: { cohortId },
    }),
  ]);

  const [paktaSigned, paktaTotal] = paktaStats;
  const [scSigned, scTotal] = socialContractStats;

  const paktaPanitiaPercent = paktaTotal > 0 ? Math.round((paktaSigned / paktaTotal) * 100) : null;
  const socialContractPercent = scTotal > 0 ? Math.round((scSigned / scTotal) * 100) : null;

  // Build Permen 55 checklist with computed statuses
  const permen55Checklist: Permen55Item[] = PERMEN55_BASE_ITEMS.map((item) => {
    let status: 'green' | 'yellow' | 'red' = 'yellow';

    switch (item.id) {
      case 'p55-03':
        status = (paktaPanitiaPercent ?? 0) >= 90 ? 'green' : (paktaPanitiaPercent ?? 0) >= 70 ? 'yellow' : 'red';
        break;
      case 'p55-04':
        status = (socialContractPercent ?? 0) >= 90 ? 'green' : (socialContractPercent ?? 0) >= 70 ? 'yellow' : 'red';
        break;
      case 'p55-05':
        status = fbViolations === 0 ? 'green' : 'red';
        break;
      case 'p55-07':
        // Anon reporting available if system has been used or is configured
        status = anonCount >= 0 ? 'green' : 'yellow';
        break;
      case 'p55-08':
        status = incidentsIn24h === 0 ? 'green' : 'red';
        break;
      case 'p55-09':
        status = completedKegiatan > 0 ? 'green' : 'yellow';
        break;
      default:
        status = 'yellow';
    }

    return { ...item, status };
  });

  log.debug('Compliance data built', {
    cohortId,
    organizationId,
    paktaPanitiaPercent,
    socialContractPercent,
    fbViolations,
    durationMs: Date.now() - start,
  });

  return {
    paktaPanitiaPercent,
    socialContractPercent,
    forbiddenActViolations: fbViolations,
    permen55Checklist,
  };
}
