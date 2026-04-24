'use client';

/**
 * /dashboard/safeguard/incidents/[incidentId]/print
 * NAWASENA M10 — HTML print fallback for Satgas escalation report.
 *
 * Opens in a new tab, triggers window.print() automatically.
 * Styled with print CSS (no sidebar, header, or nav).
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createLogger } from '@/lib/logger';

const log = createLogger('incident-print-page');

interface TimelineEntry {
  id: string;
  action: string;
  actorName?: string;
  actor?: { displayName?: string | null; fullName: string };
  noteText?: string | null;
  createdAt: string;
}

interface IncidentDetail {
  id: string;
  type: string;
  severity: string;
  status: string;
  occurredAt: string;
  createdAt: string;
  actionTaken: string | null;
  affectedUserName?: string | null;
  reportedByName?: string | null;
  claimedByName?: string | null;
  escalationReason: string | null;
  escalatedTo: string | null;
  satgasTicketRef: string | null;
  escalatedAt: string | null;
  resolutionNote: string | null;
  resolvedAt: string | null;
  attachmentKeys: string[];
}

const ACTION_LABELS: Record<string, string> = {
  CREATED: 'Dilaporkan',
  STATUS_CHANGED: 'Status berubah',
  CLAIMED_FOR_REVIEW: 'Di-claim untuk review',
  FIELD_UPDATED: 'Field diperbarui',
  NOTE_ADDED: 'Catatan ditambahkan',
  ATTACHMENT_ADDED: 'Lampiran ditambahkan',
  CONSEQUENCE_ASSIGNED: 'Konsekuensi diberikan',
  ESCALATED_TO_SATGAS: 'Diekskalasi ke Satgas',
  RESOLVED: 'Diselesaikan',
  REOPENED: 'Dibuka kembali',
  RETRACTED_BY_REPORTER: 'Ditarik reporter',
  RETRACTED_BY_SC: 'Ditarik SC',
  PEMBINA_ANNOTATION_ADDED: 'Anotasi Pembina',
};

const ESCALATION_LABELS: Record<string, string> = {
  SATGAS_PPKPT_ITS: 'Satgas PPKPT ITS',
  DITMAWA_ITS: 'Ditkemawa ITS',
  EXTERNAL_LEGAL: 'Jalur Hukum Eksternal',
};

const TYPE_LABELS: Record<string, string> = {
  PHYSICAL_HARM: 'Bahaya Fisik',
  PSYCHOLOGICAL_HARM: 'Gangguan Psikologis',
  SEXUAL_HARASSMENT: 'Pelecehan Seksual',
  PROPERTY_DAMAGE: 'Kerusakan Properti',
  FORCED_ACTIVITY: 'Kegiatan Paksa',
  COERCION: 'Pemaksaan',
  BULLYING: 'Perundungan',
  SUBSTANCE_ABUSE: 'Penyalahgunaan Zat',
  SAFE_WORD: 'Safe Word Diaktifkan',
  OTHER: 'Lainnya',
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function IncidentPrintPage() {
  const params = useParams();
  const incidentId = params.incidentId as string;

  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [incRes, tlRes] = await Promise.all([
          fetch(`/api/safeguard/incidents/${incidentId}`),
          fetch(`/api/safeguard/incidents/${incidentId}/timeline`),
        ]);

        if (incRes.ok) {
          const { data } = await incRes.json();
          setIncident(data);
        }

        if (tlRes.ok) {
          const { data } = await tlRes.json();
          const entries = (data as Array<Record<string, unknown>>).map((e) => ({
            ...e,
            actorName:
              (e.actor as { displayName?: string | null; fullName: string } | undefined)
                ?.displayName ??
              (e.actor as { displayName?: string | null; fullName: string } | undefined)
                ?.fullName ??
              'Sistem',
            createdAt:
              typeof e.createdAt === 'string'
                ? e.createdAt
                : new Date(e.createdAt as string).toISOString(),
          })) as TimelineEntry[];
          setTimeline(entries);
        }
      } catch (err) {
        log.error('Failed to load print data', { incidentId, error: err });
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [incidentId]);

  useEffect(() => {
    if (!loading && incident) {
      // Auto print after render
      setTimeout(() => window.print(), 500);
    }
  }, [loading, incident]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Memuat data insiden...</p>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">Insiden tidak ditemukan atau akses ditolak.</p>
      </div>
    );
  }

  const confirmedAttachments = incident.attachmentKeys.filter(
    (k) => !k.startsWith('PENDING:'),
  );

  return (
    <>
      {/* Print CSS injected inline */}
      <style>{`
        @media print {
          body { margin: 0; font-family: Arial, sans-serif; font-size: 11pt; color: #000; }
          .no-print { display: none !important; }
          .page-break { page-break-before: always; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; font-size: 9pt; }
          th { background: #f0f9ff; font-weight: bold; }
          .severity-RED { color: #dc2626; font-weight: bold; }
          .severity-YELLOW { color: #d97706; font-weight: bold; }
          .severity-GREEN { color: #16a34a; font-weight: bold; }
          .header-title { font-size: 18pt; color: #0369a1; }
          .section-title { font-size: 12pt; font-weight: bold; color: #0369a1; margin: 16px 0 8px; border-bottom: 1px solid #0369a1; padding-bottom: 4px; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
          .meta-item label { font-size: 8pt; color: #666; text-transform: uppercase; }
          .meta-item p { font-weight: bold; margin: 2px 0; }
          .watermark { margin-top: 40px; padding-top: 10px; border-top: 1px solid #ccc; font-size: 8pt; color: #666; }
          .sign-row { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-top: 40px; }
          .sign-box { border-top: 1px solid #000; padding-top: 6px; text-align: center; font-size: 9pt; }
          .escalation-box { background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px; margin: 8px 0; }
        }
        @media screen {
          body { font-family: system-ui, sans-serif; max-width: 800px; margin: 24px auto; padding: 24px; }
          .print-btn { background: #0ea5e9; color: white; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; margin-bottom: 24px; }
          .print-btn:hover { background: #0284c7; }
        }
      `}</style>

      <div className="no-print" style={{ marginBottom: '16px' }}>
        <button className="print-btn" onClick={() => window.print()}>
          Cetak / Simpan PDF
        </button>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0369a1', paddingBottom: '12px', marginBottom: '20px' }}>
        <div>
          <p className="header-title">LAPORAN SATGAS INSIDEN</p>
          <p style={{ fontSize: '9pt', color: '#666' }}>NAWASENA M10 Safeguard &amp; Insiden</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p className={`severity-${incident.severity}`}>{incident.severity} SEVERITY</p>
          <p style={{ fontSize: '9pt', color: '#666' }}>ID: #{incidentId.slice(-8).toUpperCase()}</p>
        </div>
      </div>

      {/* Metadata */}
      <p className="section-title">Metadata Insiden</p>
      <div className="meta-grid">
        <div className="meta-item"><label>Tipe Insiden</label><p>{TYPE_LABELS[incident.type] ?? incident.type}</p></div>
        <div className="meta-item"><label>Keparahan</label><p className={`severity-${incident.severity}`}>{incident.severity}</p></div>
        <div className="meta-item"><label>Status</label><p>{incident.status}</p></div>
        <div className="meta-item"><label>Waktu Kejadian</label><p>{formatDate(incident.occurredAt)}</p></div>
        <div className="meta-item"><label>Dilaporkan</label><p>{formatDate(incident.createdAt)}</p></div>
        <div className="meta-item"><label>Dilaporkan Oleh</label><p>{incident.reportedByName ?? '—'}</p></div>
        {incident.affectedUserName && (
          <div className="meta-item"><label>Pihak Terdampak</label><p>{incident.affectedUserName}</p></div>
        )}
        {incident.claimedByName && (
          <div className="meta-item"><label>Ditangani Oleh</label><p>{incident.claimedByName}</p></div>
        )}
        {confirmedAttachments.length > 0 && (
          <div className="meta-item"><label>Jumlah Lampiran</label><p>{confirmedAttachments.length}</p></div>
        )}
      </div>

      {incident.actionTaken && (
        <>
          <p className="section-title">Tindakan Awal</p>
          <p style={{ fontSize: '10pt' }}>{incident.actionTaken}</p>
        </>
      )}

      {incident.escalationReason && (
        <>
          <p className="section-title">
            Alasan Eskalasi ke {ESCALATION_LABELS[incident.escalatedTo ?? ''] ?? incident.escalatedTo}
          </p>
          <div className="escalation-box">
            <p style={{ fontSize: '10pt' }}>{incident.escalationReason}</p>
            {incident.satgasTicketRef && <p style={{ fontSize: '9pt', color: '#666', marginTop: '6px' }}>Tiket: {incident.satgasTicketRef}</p>}
            {incident.escalatedAt && <p style={{ fontSize: '9pt', color: '#666' }}>Dieskalasi: {formatDate(incident.escalatedAt)}</p>}
          </div>
        </>
      )}

      {incident.resolutionNote && (
        <>
          <p className="section-title">Catatan Resolusi</p>
          <p style={{ fontSize: '10pt' }}>{incident.resolutionNote}</p>
          {incident.resolvedAt && <p style={{ fontSize: '9pt', color: '#666' }}>Diselesaikan: {formatDate(incident.resolvedAt)}</p>}
        </>
      )}

      {/* Timeline table */}
      <p className="section-title">Kronologi Insiden ({timeline.length} entri)</p>
      <table>
        <thead>
          <tr>
            <th style={{ width: '20%' }}>Waktu</th>
            <th style={{ width: '25%' }}>Aksi</th>
            <th style={{ width: '20%' }}>Pelaku</th>
            <th style={{ width: '35%' }}>Catatan</th>
          </tr>
        </thead>
        <tbody>
          {timeline.map((entry, idx) => (
            <tr key={entry.id} style={{ background: idx % 2 === 1 ? '#f8fafc' : undefined }}>
              <td style={{ fontSize: '8pt', color: '#555' }}>{formatDate(entry.createdAt)}</td>
              <td>{ACTION_LABELS[entry.action] ?? entry.action}</td>
              <td>{entry.actorName ?? '—'}</td>
              <td style={{ fontSize: '8pt', color: '#666' }}>{entry.noteText ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Sign-off */}
      <div className="sign-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', marginTop: '40px' }}>
        <div className="sign-box">
          <p>Penanggung Jawab Safeguard</p>
          <p style={{ marginTop: '40px' }}>_______________________</p>
        </div>
        <div className="sign-box">
          <p>Pembina / Perwakilan Satgas</p>
          <p style={{ marginTop: '40px' }}>_______________________</p>
        </div>
      </div>

      {/* Watermark */}
      <div className="watermark">
        <p>Dicetak pada: {new Date().toLocaleString('id-ID')} &nbsp;|&nbsp; DOKUMEN RAHASIA — TIDAK UNTUK DISEBARLUASKAN</p>
      </div>
    </>
  );
}
