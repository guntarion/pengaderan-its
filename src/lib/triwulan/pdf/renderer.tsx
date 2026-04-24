/**
 * src/lib/triwulan/pdf/renderer.tsx
 * NAWASENA M14 — React PDF renderer for Triwulan Review document.
 *
 * Uses @react-pdf/renderer to generate a PDF buffer.
 * All sections: cover, exec summary, KPI, Kirkpatrick, incidents, anon,
 * compliance, cohort comparison, audit substansi, escalation, signature chain, footer.
 */

import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer';
import { createLogger } from '@/lib/logger';
import type { BarChartData } from './chart-generator';

const log = createLogger('m14/pdf/renderer');

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    paddingTop: 50,
    paddingBottom: 50,
    paddingHorizontal: 50,
    color: '#1e293b',
    lineHeight: 1.4,
  },
  // Cover
  coverPage: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 120,
  },
  coverTitle: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#0ea5e9',
    textAlign: 'center',
    marginBottom: 8,
  },
  coverSubtitle: {
    fontSize: 14,
    color: '#334155',
    textAlign: 'center',
    marginBottom: 4,
  },
  coverMeta: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 2,
  },
  coverFooter: {
    position: 'absolute',
    bottom: 40,
    left: 50,
    right: 50,
    textAlign: 'center',
    fontSize: 8,
    color: '#94a3b8',
  },
  // Sections
  sectionHeader: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#0ea5e9',
    marginTop: 18,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#bae6fd',
  },
  subsectionHeader: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#334155',
    marginTop: 10,
    marginBottom: 4,
  },
  // Table
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 4,
  },
  tableHeader: {
    backgroundColor: '#f0f9ff',
  },
  tableCell: {
    flex: 1,
    fontSize: 8,
    color: '#334155',
    paddingHorizontal: 4,
  },
  tableCellBold: {
    flex: 1,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    paddingHorizontal: 4,
  },
  // Cards
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    padding: 8,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#334155',
    marginBottom: 2,
  },
  cardBody: {
    fontSize: 8,
    color: '#64748b',
  },
  // Escalation
  escalationBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
  },
  escalationTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#dc2626',
    marginBottom: 4,
  },
  warningBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#d97706',
    marginBottom: 4,
  },
  // Signature chain
  signatureRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
  },
  signatureLabel: {
    width: 140,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#334155',
  },
  signatureValue: {
    flex: 1,
    fontSize: 8,
    color: '#64748b',
  },
  // Misc
  paragraph: {
    fontSize: 9,
    color: '#334155',
    marginBottom: 6,
    lineHeight: 1.5,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    alignSelf: 'flex-start',
  },
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 50,
    right: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 7,
    color: '#94a3b8',
    borderTopWidth: 0.5,
    borderTopColor: '#e2e8f0',
    paddingTop: 4,
  },
});

// ── Types ────────────────────────────────────────────────────────────────────

interface PDFRenderInput {
  reviewId: string;
  quarterNumber: number;
  cohortCode: string;
  cohortName: string;
  orgName: string;
  generatedAt: string;
  executiveSummary: string | null;
  escalationLevel: string;
  dataSnapshotJsonb: Record<string, unknown>;
  auditSubstansiResults: Array<{
    itemKey: string;
    coverage: string;
    notes: string | null;
    assessedBy: { displayName: string | null; fullName: string | null } | null;
    assessedAt: string | null;
  }>;
  signatureEvents: Array<{
    action: string;
    actorDisplayName: string | null;
    actorFullName: string | null;
    notes: string | null;
    createdAt: string;
  }>;
  kpiChartData: BarChartData | null;
}

const QUARTER_LABELS = ['', 'Triwulan I', 'Triwulan II', 'Triwulan III', 'Triwulan IV'];

const COVERAGE_LABELS: Record<string, string> = {
  COVERED: 'Tercakup',
  PARTIAL: 'Sebagian',
  NOT_COVERED: 'Tidak Tercakup',
  NOT_ASSESSED: 'Belum Dinilai',
};

const MUATAN_LABELS: Record<string, string> = {
  NARASI_SEPULUH_NOPEMBER: 'Narasi Sepuluh Nopember',
  ADVANCING_HUMANITY: 'Advancing Humanity',
  ENAM_TATA_NILAI_ITS: '6 Tata Nilai ITS',
  INTEGRALISTIK: 'Pendidikan Integralistik',
  STRUKTUR_KM_ITS: 'Struktur KM ITS',
  TRI_DHARMA: 'Tri Dharma Perguruan Tinggi',
  KODE_ETIK_MAHASISWA: 'Kode Etik Mahasiswa ITS',
  PERMEN_55_2024_SATGAS: 'Permen 55/2024 & Satgas PPKPT',
  RISET_ITS: 'Riset & Inovasi ITS',
  KEINSINYURAN_PII: 'Keinsinyuran & PII',
};

// ── Components ───────────────────────────────────────────────────────────────

function CoverPage({ input }: { input: PDFRenderInput }) {
  return (
    <Page size="A4" style={[styles.page, styles.coverPage]}>
      <Text style={styles.coverTitle}>LAPORAN REVIEW TRIWULAN</Text>
      <Text style={styles.coverTitle}>KADERISASI NAWASENA ITS</Text>
      <View style={{ height: 20 }} />
      <Text style={styles.coverSubtitle}>
        {QUARTER_LABELS[input.quarterNumber] ?? `Q${input.quarterNumber}`}
      </Text>
      <Text style={styles.coverSubtitle}>{input.cohortCode} — {input.cohortName}</Text>
      <View style={{ height: 12 }} />
      <Text style={styles.coverMeta}>{input.orgName}</Text>
      <Text style={styles.coverMeta}>
        Dibuat: {new Date(input.generatedAt).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })}
      </Text>
      <Text style={styles.coverMeta}>Review ID: {input.reviewId}</Text>
      {input.escalationLevel !== 'NONE' && (
        <View style={{ marginTop: 20, alignItems: 'center' }}>
          <View style={
            input.escalationLevel === 'URGENT'
              ? styles.escalationBox
              : styles.warningBox
          }>
            <Text style={
              input.escalationLevel === 'URGENT'
                ? styles.escalationTitle
                : styles.warningTitle
            }>
              ESKALASI: {input.escalationLevel}
            </Text>
          </View>
        </View>
      )}
      <Text style={styles.coverFooter}>
        Dokumen ini bersifat rahasia dan hanya untuk penggunaan internal NAWASENA ITS.
        Dihasilkan secara otomatis oleh Sistem Informasi NAWASENA.
      </Text>
    </Page>
  );
}

function ExecSummaryPage({ input }: { input: PDFRenderInput }) {
  const snap = input.dataSnapshotJsonb;
  const escalationFlags = (snap.escalationFlags as string[]) ?? [];

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionHeader}>RINGKASAN EKSEKUTIF</Text>

      {escalationFlags.length > 0 && (
        <View style={input.escalationLevel === 'URGENT' ? styles.escalationBox : styles.warningBox}>
          <Text style={input.escalationLevel === 'URGENT' ? styles.escalationTitle : styles.warningTitle}>
            Eskalasi {input.escalationLevel}
          </Text>
          {escalationFlags.map((f: string) => (
            <Text key={f} style={{ fontSize: 8, color: input.escalationLevel === 'URGENT' ? '#dc2626' : '#d97706' }}>
              • {f.replace(/_/g, ' ')}
            </Text>
          ))}
        </View>
      )}

      <Text style={styles.paragraph}>
        {input.executiveSummary || '(Narasi eksekutif belum diisi)'}
      </Text>

      {Boolean(snap.generatedMidQuarter) && (
        <View style={styles.warningBox}>
          <Text style={{ fontSize: 8, color: '#d97706' }}>
            Catatan: Review ini dibuat di tengah triwulan. Data mungkin belum mencerminkan
            seluruh periode triwulan.
          </Text>
        </View>
      )}

      {Boolean(snap.dataPartial) && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sumber Data Tidak Tersedia</Text>
          <Text style={styles.cardBody}>
            {((snap.missingSources as string[]) ?? []).join(', ') || 'tidak diketahui'}
          </Text>
        </View>
      )}

      <Footer reviewId={input.reviewId} />
    </Page>
  );
}

function KPIPage({ input }: { input: PDFRenderInput }) {
  const kpi = input.dataSnapshotJsonb.kpi as Record<string, unknown> | null;

  const metrics = [
    { label: 'Retensi Peserta', value: (kpi?.retention as { value: number } | null)?.value, unit: '%', threshold: 85 },
    { label: 'NPS Rata-Rata', value: (kpi?.npsAvg as { value: number } | null)?.value, unit: '' },
    { label: 'Pulse Score', value: (kpi?.pulseAvg as { value: number } | null)?.value, unit: '/5' },
    { label: 'Tingkat Jurnal', value: (kpi?.journalRate as { value: number } | null)?.value, unit: '%' },
    { label: 'Kehadiran', value: (kpi?.attendanceRate as { value: number } | null)?.value, unit: '%' },
    { label: 'Penyelesaian Passport', value: (kpi?.passportCompletionRate as { value: number } | null)?.value, unit: '%' },
  ];

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionHeader}>DATA KPI TRIWULAN</Text>

      <View style={[styles.tableRow, styles.tableHeader]}>
        <Text style={[styles.tableCellBold, { flex: 2 }]}>Indikator</Text>
        <Text style={styles.tableCellBold}>Nilai</Text>
        <Text style={styles.tableCellBold}>Status</Text>
      </View>
      {metrics.map((m) => {
        const isBelowThreshold = m.threshold !== undefined && m.value !== undefined && m.value !== null && m.value < m.threshold;
        return (
          <View key={m.label} style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>{m.label}</Text>
            <Text style={styles.tableCell}>
              {m.value !== null && m.value !== undefined ? `${m.value.toFixed(1)}${m.unit}` : '—'}
            </Text>
            <Text style={[styles.tableCell, { color: isBelowThreshold ? '#dc2626' : '#10b981' }]}>
              {m.value === null || m.value === undefined ? '—' : isBelowThreshold ? 'Di Bawah Target' : 'Aman'}
            </Text>
          </View>
        );
      })}

      <Footer reviewId={input.reviewId} />
    </Page>
  );
}

function KirkpatrickPage({ input }: { input: PDFRenderInput }) {
  const kirk = input.dataSnapshotJsonb.kirkpatrick as Record<string, unknown> | null;

  const levels = [
    { key: 'l1', label: 'L1 — Reaksi', desc: 'NPS & kepuasan peserta' },
    { key: 'l2', label: 'L2 — Pembelajaran', desc: 'Skor rubrik & kompetensi' },
    { key: 'l3', label: 'L3 — Perilaku', desc: 'Retensi & perubahan perilaku' },
    { key: 'l4', label: 'L4 — Hasil', desc: 'Dampak institusional' },
  ];

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionHeader}>EVALUASI KIRKPATRICK</Text>

      {levels.map((level) => {
        const data = (kirk?.[level.key] as { score: number | null; count: number; partial?: boolean }) ?? { score: null, count: 0 };
        return (
          <View key={level.key} style={styles.card}>
            <Text style={styles.cardTitle}>{level.label}</Text>
            <Text style={[styles.cardBody, { marginBottom: 2 }]}>{level.desc}</Text>
            <Text style={styles.cardBody}>
              Skor: {data.score !== null ? data.score.toFixed(1) : '—'}
              {data.count > 0 ? ` (n=${data.count})` : ''}
              {data.partial ? ' — Data sebagian' : ''}
            </Text>
          </View>
        );
      })}

      <Footer reviewId={input.reviewId} />
    </Page>
  );
}

function IncidentsPage({ input }: { input: PDFRenderInput }) {
  const snap = input.dataSnapshotJsonb;
  const incidents = snap.incidents as Record<string, unknown> | null;
  const redFlags = snap.redFlags as Record<string, unknown> | null;
  const anonReports = snap.anonReports as Record<string, unknown> | null;
  const forbiddenActs = snap.forbiddenActs as { violations?: unknown[] } | null;

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionHeader}>KEAMANAN & INSIDEN</Text>

      <Text style={styles.subsectionHeader}>Insiden</Text>
      <View style={styles.card}>
        <Text style={styles.cardBody}>
          Total: {(incidents?.total as number) ?? '—'} |{' '}
          Merah: {(incidents?.bySeverity as Record<string, number>)?.RED ?? '—'} |{' '}
          Terbuka: {(incidents?.openCount as number) ?? '—'}
        </Text>
      </View>

      <Text style={styles.subsectionHeader}>Red Flag Alerts</Text>
      <View style={styles.card}>
        <Text style={styles.cardBody}>
          Aktif: {(redFlags?.activeCount as number) ?? '—'} |{' '}
          Urgen: {(redFlags?.byLevel as Record<string, number>)?.URGENT ?? '—'}
        </Text>
      </View>

      <Text style={styles.subsectionHeader}>Laporan Anonim</Text>
      <View style={styles.card}>
        <Text style={styles.cardBody}>
          Total: {(anonReports?.total as number) ?? '—'} |{' '}
          Terbuka: {(anonReports?.openCount as number) ?? '—'}
        </Text>
        <Text style={[styles.cardBody, { fontFamily: 'Helvetica-Oblique', marginTop: 2, fontSize: 7 }]}>
          Data anonim — detail identitas tidak dicantumkan dalam laporan ini.
        </Text>
      </View>

      {forbiddenActs && (forbiddenActs.violations?.length ?? 0) > 0 && (
        <>
          <Text style={styles.subsectionHeader}>Tindakan Terlarang</Text>
          <View style={styles.escalationBox}>
            <Text style={[styles.escalationTitle, { fontSize: 9 }]}>
              {forbiddenActs.violations?.length} pelanggaran terdeteksi
            </Text>
          </View>
        </>
      )}

      <Footer reviewId={input.reviewId} />
    </Page>
  );
}

function AuditSubstansiPage({ input }: { input: PDFRenderInput }) {
  const results = input.auditSubstansiResults;

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionHeader}>AUDIT SUBSTANSI — 10 MUATAN WAJIB</Text>

      <View style={[styles.tableRow, styles.tableHeader]}>
        <Text style={[styles.tableCellBold, { flex: 2.5 }]}>Muatan Wajib</Text>
        <Text style={styles.tableCellBold}>Status</Text>
        <Text style={[styles.tableCellBold, { flex: 2 }]}>Catatan</Text>
      </View>

      {results.length > 0 ? (
        results.map((r) => (
          <View key={r.itemKey} style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2.5 }]}>
              {MUATAN_LABELS[r.itemKey] ?? r.itemKey}
            </Text>
            <Text style={[
              styles.tableCell,
              {
                color: r.coverage === 'COVERED'
                  ? '#10b981'
                  : r.coverage === 'NOT_COVERED'
                  ? '#dc2626'
                  : r.coverage === 'PARTIAL'
                  ? '#d97706'
                  : '#94a3b8',
              },
            ]}>
              {COVERAGE_LABELS[r.coverage] ?? r.coverage}
            </Text>
            <Text style={[styles.tableCell, { flex: 2, fontSize: 7 }]}>
              {r.notes ?? '—'}
            </Text>
          </View>
        ))
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardBody}>Audit substansi belum dilakukan.</Text>
        </View>
      )}

      <Footer reviewId={input.reviewId} />
    </Page>
  );
}

function SignaturePage({ input }: { input: PDFRenderInput }) {
  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionHeader}>JEJAK TANDA TANGAN & KRONOLOGI</Text>

      {input.signatureEvents.map((ev, idx) => (
        <View key={idx} style={styles.signatureRow}>
          <Text style={styles.signatureLabel}>{ev.action.replace(/_/g, ' ')}</Text>
          <Text style={styles.signatureValue}>
            {ev.actorDisplayName ?? ev.actorFullName ?? 'Sistem'} —{' '}
            {new Date(ev.createdAt).toLocaleDateString('id-ID', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
            {ev.notes ? ` — "${ev.notes.substring(0, 60)}${ev.notes.length > 60 ? '...' : ''}"` : ''}
          </Text>
        </View>
      ))}

      <View style={{ marginTop: 40 }}>
        <Text style={{ fontSize: 8, color: '#64748b', textAlign: 'center' }}>
          Dokumen ini dihasilkan secara otomatis oleh Sistem Informasi NAWASENA ITS.
          {'\n'}Keaslian dokumen dapat diverifikasi melalui portal NAWASENA menggunakan Review ID.
        </Text>
      </View>

      <Footer reviewId={input.reviewId} />
    </Page>
  );
}

function Footer({ reviewId }: { reviewId: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text>Review ID: {reviewId}</Text>
      <Text>NAWASENA ITS — Laporan Triwulan</Text>
      <Text render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function TriwulanReviewDocument({ input }: { input: PDFRenderInput }) {
  return (
    <Document
      title={`Laporan Triwulan — ${QUARTER_LABELS[input.quarterNumber]} ${input.cohortCode}`}
      author="NAWASENA ITS"
      subject="Review Triwulan Kaderisasi"
      creator="Sistem Informasi NAWASENA"
    >
      <CoverPage input={input} />
      <ExecSummaryPage input={input} />
      <KPIPage input={input} />
      <KirkpatrickPage input={input} />
      <IncidentsPage input={input} />
      <AuditSubstansiPage input={input} />
      <SignaturePage input={input} />
    </Document>
  );
}

// ── Export ───────────────────────────────────────────────────────────────────

/**
 * Render the Triwulan Review to a PDF buffer.
 * Throws on failure — caller (job-queue) handles retries.
 */
export async function renderTriwulanPDF(input: PDFRenderInput): Promise<Buffer> {
  log.info('Rendering triwulan PDF', {
    reviewId: input.reviewId,
    quarterNumber: input.quarterNumber,
    cohortCode: input.cohortCode,
  });

  const buffer = await renderToBuffer(<TriwulanReviewDocument input={input} />);

  log.info('PDF rendered successfully', {
    reviewId: input.reviewId,
    bytes: buffer.length,
  });

  return Buffer.from(buffer);
}

export type { PDFRenderInput };
