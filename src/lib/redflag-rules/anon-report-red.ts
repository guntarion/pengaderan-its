/**
 * src/lib/redflag-rules/anon-report-red.ts
 * Rule: ANON_REPORT_RED_NEW — new anonymous report with severity CRITICAL/HIGH in last 24h.
 */

import { AnonSeverity, RedFlagSeverity, RedFlagType, UserRole } from '@prisma/client';
import type { RedFlagRule, RuleContext, RuleHit } from './types';

export const anonReportRedRule: RedFlagRule = {
  type: RedFlagType.ANON_REPORT_RED_NEW,
  name: 'Laporan Anonim Baru (Merah)',
  defaultSeverity: RedFlagSeverity.CRITICAL,
  enabled: true,
  targetRoles: [UserRole.BLM, UserRole.SC, UserRole.SATGAS],

  async evaluate(ctx: RuleContext): Promise<RuleHit[]> {
    const { organizationId, prisma, log } = ctx;
    const hits: RuleHit[] = [];

    const since = new Date();
    since.setHours(since.getHours() - 24);

    // Query for new RED-severity anonymous reports in last 24h (AnonSeverity: GREEN/YELLOW/RED)
    const newReports = await prisma.anonReport.findMany({
      where: {
        organizationId,
        severity: AnonSeverity.RED,
        status: 'NEW',
        recordedAt: { gte: since },
      },
      select: {
        id: true,
        trackingCode: true,
        severity: true,
        recordedAt: true,
      },
    });

    for (const report of newReports) {
      hits.push({
        targetResourceId: report.id,
        title: 'Laporan Anonim Baru — Merah',
        description: `Laporan anonim dengan kode ${report.trackingCode} (RED) belum ditangani`,
        severity: RedFlagSeverity.CRITICAL,
        targetRoles: [UserRole.BLM, UserRole.SC, UserRole.SATGAS],
        // Note: URL shows tracking code only — no body for privacy
        targetUrl: `/dashboard/blm/anon-reports?tracking=${report.trackingCode}`,
        metadata: { trackingCode: report.trackingCode, severity: report.severity },
      });
    }

    log.debug('anon-report-red evaluated', { organizationId, hits: hits.length });
    return hits;
  },
};
