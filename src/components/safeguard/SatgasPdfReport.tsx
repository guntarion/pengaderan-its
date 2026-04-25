/**
 * src/components/safeguard/SatgasPdfReport.tsx
 * NAWASENA M10 — PDF report for Satgas escalation using @react-pdf/renderer.
 *
 * Renders: header, incident metadata, reporter, timeline table,
 * escalation reason, sign-off, watermark footer.
 *
 * Used by satgas-export.ts (server-side rendering with renderToBuffer).
 */

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';

// ---- Data types ----

export interface SatgasPdfTimelineEntry {
  id: string;
  action: string;
  actorName: string;
  noteText?: string | null;
  createdAt: string;
}

export interface SatgasPdfData {
  incidentId: string;
  incidentType: string;
  incidentSeverity: string;
  incidentStatus: string;
  occurredAt: string;
  createdAt: string;
  reportedByName: string;
  affectedUserName?: string | null;
  actionTaken?: string | null;
  escalationReason: string;
  escalatedTo: string;
  satgasTicketRef?: string | null;
  attachmentCount: number;
  organizationName: string;
  cohortName?: string | null;
  downloaderName: string;
  downloadedAt: string;
  timeline: SatgasPdfTimelineEntry[];
}

// ---- Styles ----

const colors = {
  primary: '#0ea5e9', // sky-500
  danger: '#ef4444',  // red-500
  amber: '#f59e0b',
  dark: '#1e293b',
  muted: '#64748b',
  border: '#e2e8f0',
  headerBg: '#f0f9ff', // sky-50
  rowBg: '#f8fafc',
};

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: colors.dark,
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 40,
  },
  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingBottom: 10,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: 'Helvetica-Bold',
    color: colors.primary,
  },
  headerSub: {
    fontSize: 8,
    color: colors.muted,
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerBadge: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  // Section
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 4,
    marginBottom: 8,
  },
  // Info grid
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoCell: {
    width: '50%',
    marginBottom: 5,
  },
  infoLabel: {
    fontSize: 7,
    color: colors.muted,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: colors.dark,
    marginTop: 1,
  },
  // Timeline table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.headerBg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  tableRowAlt: {
    backgroundColor: colors.rowBg,
  },
  colTime: { width: '20%' },
  colAction: { width: '25%' },
  colActor: { width: '20%' },
  colNote: { width: '35%' },
  colHeaderText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: colors.muted,
    textTransform: 'uppercase',
  },
  colCellText: {
    fontSize: 8,
    color: colors.dark,
  },
  colCellMuted: {
    fontSize: 7,
    color: colors.muted,
  },
  // Escalation box
  escalationBox: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
    padding: 8,
    borderRadius: 2,
  },
  escalationText: {
    fontSize: 9,
    color: colors.dark,
    lineHeight: 1.5,
  },
  // Sign-off
  signOffRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  signOffBox: {
    width: '45%',
    borderTopWidth: 1,
    borderTopColor: colors.dark,
    paddingTop: 4,
    alignItems: 'center',
  },
  signOffLabel: {
    fontSize: 8,
    color: colors.muted,
  },
  signOffName: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: colors.dark,
    marginTop: 2,
  },
  // Footer watermark
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: colors.muted,
  },
  footerWarning: {
    fontSize: 7,
    color: colors.danger,
    fontFamily: 'Helvetica-Bold',
  },
});

// ---- Severity colors ----

function severityColor(s: string) {
  if (s === 'RED') return colors.danger;
  if (s === 'YELLOW') return colors.amber;
  return '#22c55e';
}

// ---- Action labels (subset, fallback to raw value) ----

const ACTION_LABELS: Record<string, string> = {
  CREATED: 'Dilaporkan',
  STATUS_CHANGED: 'Status berubah',
  CLAIMED_FOR_REVIEW: 'Di-claim',
  FIELD_UPDATED: 'Field diupdate',
  NOTE_ADDED: 'Catatan',
  ATTACHMENT_ADDED: 'Lampiran',
  CONSEQUENCE_ASSIGNED: 'Konsekuensi',
  ESCALATED_TO_SATGAS: 'Eskalasi Satgas',
  RESOLVED: 'Diselesaikan',
  REOPENED: 'Dibuka kembali',
  RETRACTED_BY_REPORTER: 'Ditarik reporter',
  RETRACTED_BY_SC: 'Ditarik SC',
  PEMBINA_ANNOTATION_ADDED: 'Anotasi Pembina',
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ---- PDF Document component ----

export function SatgasPdfReport({ data }: { data: SatgasPdfData }) {
  const severityCol = severityColor(data.incidentSeverity);

  return (
    <Document
      title={`Laporan Satgas — Insiden ${data.incidentId}`}
      author="NAWASENA M10 Safeguard"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>LAPORAN SATGAS INSIDEN</Text>
            <Text style={styles.headerSub}>
              NAWASENA · {data.organizationName}
              {data.cohortName ? ` · ${data.cohortName}` : ''}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text
              style={[
                styles.headerBadge,
                { backgroundColor: severityCol + '22', color: severityCol },
              ]}
            >
              {data.incidentSeverity} SEVERITY
            </Text>
            <Text style={styles.headerSub}>ID: {data.incidentId.slice(-8).toUpperCase()}</Text>
          </View>
        </View>

        {/* Incident Metadata */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Metadata Insiden</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>Tipe Insiden</Text>
              <Text style={styles.infoValue}>{data.incidentType}</Text>
            </View>
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>Tingkat Keparahan</Text>
              <Text style={[styles.infoValue, { color: severityCol }]}>
                {data.incidentSeverity}
              </Text>
            </View>
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>Status Saat Ini</Text>
              <Text style={styles.infoValue}>{data.incidentStatus}</Text>
            </View>
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>Waktu Kejadian</Text>
              <Text style={styles.infoValue}>{formatDate(data.occurredAt)}</Text>
            </View>
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>Tanggal Dilaporkan</Text>
              <Text style={styles.infoValue}>{formatDate(data.createdAt)}</Text>
            </View>
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>Eskalasi Ke</Text>
              <Text style={styles.infoValue}>{data.escalatedTo}</Text>
            </View>
            {data.satgasTicketRef && (
              <View style={styles.infoCell}>
                <Text style={styles.infoLabel}>No. Tiket Satgas</Text>
                <Text style={styles.infoValue}>{data.satgasTicketRef}</Text>
              </View>
            )}
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>Jumlah Lampiran</Text>
              <Text style={styles.infoValue}>{data.attachmentCount}</Text>
            </View>
          </View>
        </View>

        {/* Parties */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pihak Terlibat</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>Dilaporkan Oleh</Text>
              <Text style={styles.infoValue}>{data.reportedByName}</Text>
            </View>
            {data.affectedUserName && (
              <View style={styles.infoCell}>
                <Text style={styles.infoLabel}>Pihak Terdampak</Text>
                <Text style={styles.infoValue}>{data.affectedUserName}</Text>
              </View>
            )}
          </View>
          {data.actionTaken && (
            <View style={{ marginTop: 6 }}>
              <Text style={styles.infoLabel}>Tindakan Awal</Text>
              <Text style={[styles.infoValue, { fontSize: 8, marginTop: 2, fontFamily: 'Helvetica' }]}>
                {data.actionTaken}
              </Text>
            </View>
          )}
        </View>

        {/* Escalation Reason */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alasan Eskalasi</Text>
          <View style={styles.escalationBox}>
            <Text style={styles.escalationText}>{data.escalationReason}</Text>
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Kronologi Insiden ({data.timeline.length} entri)
          </Text>
          {/* Table header */}
          <View style={styles.tableHeader}>
            <View style={styles.colTime}>
              <Text style={styles.colHeaderText}>Waktu</Text>
            </View>
            <View style={styles.colAction}>
              <Text style={styles.colHeaderText}>Aksi</Text>
            </View>
            <View style={styles.colActor}>
              <Text style={styles.colHeaderText}>Pelaku</Text>
            </View>
            <View style={styles.colNote}>
              <Text style={styles.colHeaderText}>Catatan</Text>
            </View>
          </View>
          {/* Rows */}
          {data.timeline.map((entry, idx) => (
            <View
              key={entry.id}
              style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}
            >
              <View style={styles.colTime}>
                <Text style={styles.colCellMuted}>{formatDate(entry.createdAt)}</Text>
              </View>
              <View style={styles.colAction}>
                <Text style={styles.colCellText}>
                  {ACTION_LABELS[entry.action] ?? entry.action}
                </Text>
              </View>
              <View style={styles.colActor}>
                <Text style={styles.colCellText}>{entry.actorName}</Text>
              </View>
              <View style={styles.colNote}>
                <Text style={styles.colCellMuted}>{entry.noteText ?? '—'}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Sign-off */}
        <View style={styles.signOffRow}>
          <View style={styles.signOffBox}>
            <Text style={styles.signOffLabel}>Penanggung Jawab Safeguard</Text>
            <Text style={styles.signOffName}>_______________________</Text>
          </View>
          <View style={styles.signOffBox}>
            <Text style={styles.signOffLabel}>Pembina / Perwakilan Satgas</Text>
            <Text style={styles.signOffName}>_______________________</Text>
          </View>
        </View>

        {/* Footer watermark */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Diunduh oleh: {data.downloaderName} · {formatDate(data.downloadedAt)}
          </Text>
          <Text style={styles.footerWarning}>DOKUMEN RAHASIA — TIDAK UNTUK DISEBARLUASKAN</Text>
        </View>
      </Page>
    </Document>
  );
}
