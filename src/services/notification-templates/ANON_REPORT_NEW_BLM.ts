/**
 * src/services/notification-templates/ANON_REPORT_NEW_BLM.ts
 * NAWASENA M12 — Notification template for new anonymous report (BLM).
 *
 * Type: NORMAL
 * To: BLM officers for the cohort
 *
 * PRIVACY: Content contains ONLY trackingCode, category, severity, cohortName.
 * NO body text, NO attachment references, NO reporter info.
 */

export const ANON_REPORT_NEW_BLM_TEMPLATE = {
  templateKey: 'ANON_REPORT_NEW_BLM',
  category: 'NORMAL' as const,
  description: 'Notifikasi laporan anonim baru untuk BLM kohort',

  /**
   * Expected payload fields:
   *   - trackingCode: string (e.g. "NW-A1B2C3D4")
   *   - category: string (e.g. "HARASSMENT")
   *   - severity: string (e.g. "RED")
   *   - cohortName: string (e.g. "HMTC - C26")
   */
  payloadSchema: {
    trackingCode: 'string',
    category: 'string',
    severity: 'string',
    cohortName: 'string',
  },

  push: {
    title: 'Laporan Anonim Baru',
    body: (payload: Record<string, string>) =>
      `Laporan anonim baru diterima untuk kohort ${payload.cohortName}. ` +
      `Kode: ${payload.trackingCode}. Kategori: ${payload.category}.`,
    url: '/dashboard/blm/anon-reports',
  },

  email: {
    subject: (payload: Record<string, string>) =>
      `[NAWASENA] Laporan Anonim Baru — ${payload.cohortName}`,
    body: (payload: Record<string, string>) =>
      [
        `Laporan anonim baru diterima untuk kohort ${payload.cohortName}.`,
        '',
        `Kode Laporan : ${payload.trackingCode}`,
        `Kategori     : ${payload.category}`,
        `Severity     : ${payload.severity}`,
        '',
        'Login ke dashboard BLM untuk melihat detail laporan.',
        '',
        '---',
        'NAWASENA M12 — Sistem Laporan Anonim',
      ].join('\n'),
  },
} as const;

export type AnonReportNewBLMPayload = {
  trackingCode: string;
  category: string;
  severity: string;
  cohortName: string;
};
