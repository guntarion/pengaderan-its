/**
 * src/services/notification-templates/ANON_REPORT_ESCALATED_SATGAS.ts
 * NAWASENA M12 — Notification template for Satgas escalation (CRITICAL).
 *
 * Type: CRITICAL
 * To: Satgas PPKPT ITS
 *
 * PRIVACY: Content contains ONLY trackingCode, category, severity, cohortName.
 * NO body text, NO attachment info, NO reporter info.
 */

export const ANON_REPORT_ESCALATED_SATGAS_TEMPLATE = {
  templateKey: 'ANON_REPORT_ESCALATED_SATGAS',
  category: 'CRITICAL' as const,
  description: 'Notifikasi eskalasi laporan anonim ke Satgas PPKPT (CRITICAL)',

  /**
   * Expected payload fields:
   *   - trackingCode: string
   *   - category: string
   *   - severity: string
   *   - cohortName: string
   *   - severityReason: string (comma-separated reasons)
   */
  payloadSchema: {
    trackingCode: 'string',
    category: 'string',
    severity: 'string',
    cohortName: 'string',
    severityReason: 'string',
  },

  push: {
    title: 'CRITICAL: Laporan Anonim Diteruskan',
    body: (payload: Record<string, string>) =>
      `Laporan anonim diteruskan ke Satgas. ` +
      `Kode: ${payload.trackingCode}. Kategori: ${payload.category}. ` +
      `Kohort: ${payload.cohortName}.`,
    url: '/dashboard/satgas/escalated-reports',
  },

  email: {
    subject: (payload: Record<string, string>) =>
      `[NAWASENA CRITICAL] Laporan Anonim Diteruskan ke Satgas — ${payload.cohortName}`,
    body: (payload: Record<string, string>) =>
      [
        'CRITICAL: Laporan anonim diteruskan ke Satgas PPKPT ITS.',
        '',
        `Kode Laporan   : ${payload.trackingCode}`,
        `Kategori       : ${payload.category}`,
        `Severity       : ${payload.severity}`,
        `Kohort         : ${payload.cohortName}`,
        `Alasan Eskalasi: ${payload.severityReason || '-'}`,
        '',
        'Login ke dashboard Satgas untuk tindak lanjut segera.',
        '',
        '---',
        'NAWASENA M12 — Sistem Laporan Anonim',
        'Pesan ini dikirim otomatis. Jangan balas email ini.',
      ].join('\n'),
  },
} as const;

export type AnonReportEscalatedSatgasPayload = {
  trackingCode: string;
  category: string;
  severity: string;
  cohortName: string;
  severityReason: string;
};
