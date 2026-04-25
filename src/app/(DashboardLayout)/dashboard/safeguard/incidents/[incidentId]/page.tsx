'use client';

/**
 * /dashboard/safeguard/incidents/[incidentId]
 * NAWASENA M10 — Incident detail page.
 *
 * 2-column layout (lg: left=main detail, right=timeline+attachments).
 * Polls for fresh data every 15 seconds.
 * Shows IncidentActionBar based on viewer role + incident state.
 */

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  ExternalLink,
  RefreshCw,
  Loader2,
  Download,
} from 'lucide-react';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { IncidentStatusBadge } from '@/components/safeguard/IncidentStatusBadge';
import { IncidentTimeline, type TimelineEntry } from '@/components/safeguard/IncidentTimeline';
import { IncidentActionBar } from '@/components/safeguard/IncidentActionBar';
import { IncidentAttachmentList } from '@/components/safeguard/IncidentAttachmentList';
import { SkeletonCard } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';

const log = createLogger('incident-detail-page');

const POLL_INTERVAL_MS = 15_000;

// ---- Types ----

interface IncidentDetail {
  id: string;
  type: string;
  severity: string;
  status: string;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
  actionTaken: string | null;
  affectedUserId: string | null;
  additionalAffectedUserIds: string[];
  reportedById: string;
  reportedByName?: string | null;
  affectedUserName?: string | null;
  claimedByName?: string | null;
  claimedById: string | null;
  claimedAt: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  escalatedTo: string | null;
  escalatedAt: string | null;
  escalationReason: string | null;
  satgasTicketRef: string | null;
  satgasPdfKey: string | null;
  attachmentKeys: string[];
  retractedAt: string | null;
  retractionReason: string | null;
  canRetract?: boolean;
}

// ---- Meta label + value helpers ----

function MetaItem({
  label,
  value,
  children,
}: {
  label: string;
  value?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-0.5">
        {label}
      </p>
      {children ?? (
        <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">
          {value ?? '—'}
        </p>
      )}
    </div>
  );
}

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

const ESCALATION_TARGET_LABELS: Record<string, string> = {
  SATGAS_PPKPT_ITS: 'Satgas PPKPT ITS',
  DITMAWA_ITS: 'Ditkemawa ITS',
  EXTERNAL_LEGAL: 'Jalur Hukum Eksternal',
};

// ---- Main page ----

export default function IncidentDetailPage() {
  const params = useParams();
  const incidentId = params.incidentId as string;
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const viewer = session?.user as {
    id?: string;
    role?: string;
    isSafeguardOfficer?: boolean;
  } | undefined;

  const viewerId = viewer?.id ?? '';
  const viewerRole = viewer?.role ?? '';
  const viewerIsSGO = viewer?.isSafeguardOfficer ?? false;

  const canUploadAttachment =
    ['SC', 'OC', 'KP'].includes(viewerRole) || viewerIsSGO;

  const canSeePdfButton =
    ['SC', 'PEMBINA', 'SATGAS'].includes(viewerRole) || viewerIsSGO;

  // ---- Fetch incident ----

  const fetchIncident = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await fetch(`/api/safeguard/incidents/${incidentId}`);
        if (!res.ok) {
          if (res.status === 403) {
            router.replace('/dashboard/safeguard/incidents');
            return;
          }
          if (res.status === 404) {
            setError('Insiden tidak ditemukan');
            return;
          }
          throw new Error(`HTTP ${res.status}`);
        }
        const { data } = await res.json();
        setIncident(data);
        setLastUpdated(new Date());
        setError(null);
      } catch (err) {
        log.error('Failed to fetch incident', { incidentId, error: err });
        if (!silent) setError('Gagal memuat data insiden');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [incidentId, router],
  );

  // ---- Fetch timeline ----

  const fetchTimeline = useCallback(
    async (silent = false) => {
      if (!silent) setTimelineLoading(true);
      try {
        const res = await fetch(`/api/safeguard/incidents/${incidentId}/timeline`);
        if (!res.ok) return;
        const { data } = await res.json();
        const serialized = (data as Array<Record<string, unknown>>).map((e) => ({
          ...e,
          createdAt:
            typeof e.createdAt === 'string'
              ? e.createdAt
              : new Date(e.createdAt as string).toISOString(),
        })) as TimelineEntry[];
        setTimeline(serialized);
      } catch (err) {
        log.error('Failed to fetch timeline', { incidentId, error: err });
      } finally {
        if (!silent) setTimelineLoading(false);
      }
    },
    [incidentId],
  );

  // ---- Initial load + polling ----

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    fetchIncident();
    fetchTimeline();

    const interval = setInterval(() => {
      fetchIncident(true);
      fetchTimeline(true);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [sessionStatus, fetchIncident, fetchTimeline]);

  // ---- Action callback (re-fetch both) ----

  function handleActionComplete() {
    fetchIncident(true);
    fetchTimeline(true);
  }

  // ---- Download PDF ----

  async function handleDownloadPdf() {
    if (!incident?.satgasPdfKey) {
      toast.error('PDF belum digenerate untuk insiden ini');
      return;
    }
    setDownloadingPdf(true);
    try {
      const res = await fetch(`/api/safeguard/incidents/${incidentId}/satgas-pdf`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message ?? 'Gagal mendapatkan URL PDF');
      }
      const { data } = await res.json();
      window.open(data.url, '_blank', 'noopener,noreferrer');
      log.info('Satgas PDF download initiated', { incidentId });
    } catch (err) {
      toast.apiError(err);
      log.error('PDF download failed', { incidentId, error: err });
    } finally {
      setDownloadingPdf(false);
    }
  }

  // ---- Print fallback ----

  function handlePrint() {
    window.open(`/dashboard/safeguard/incidents/${incidentId}/print`, '_blank', 'noopener,noreferrer');
  }

  // ---- Loading / error states ----

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
        <div className="max-w-5xl mx-auto space-y-4">
          <SkeletonCard className="h-12" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <SkeletonCard className="h-48" />
              <SkeletonCard className="h-32" />
            </div>
            <div className="space-y-4">
              <SkeletonCard className="h-64" />
              <SkeletonCard className="h-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 text-center shadow-sm max-w-sm">
          <p className="text-red-500 font-medium mb-3">{error}</p>
          <Link
            href="/dashboard/safeguard/incidents"
            className="text-sm text-sky-600 hover:text-sky-700 dark:text-sky-400"
          >
            Kembali ke daftar insiden
          </Link>
        </div>
      </div>
    );
  }

  if (!incident) return null;

  const isTerminal = ['RESOLVED', 'RETRACTED_BY_REPORTER', 'RETRACTED_BY_SC', 'SUPERSEDED', 'ESCALATED_TO_SATGAS'].includes(
    incident.status,
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-5xl mx-auto p-4 space-y-4">
        {/* Breadcrumb */}
        <DynamicBreadcrumb
          labels={{
            safeguard: 'Safeguard',
            incidents: 'Insiden',
            [incidentId]: `#${incidentId.slice(-8).toUpperCase()}`,
          }}
          homeHref="/dashboard"
        />

        {/* Header */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <Link
                href="/dashboard/safeguard/incidents"
                className="mt-0.5 p-1.5 rounded-lg text-gray-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Insiden #{incidentId.slice(-8).toUpperCase()}
                  </h1>
                  <IncidentStatusBadge severity={incident.severity} status={incident.status} />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {TYPE_LABELS[incident.type] ?? incident.type} &bull; Dilaporkan{' '}
                  {formatDate(incident.createdAt)}
                </p>
              </div>
            </div>

            {/* Top-right: PDF + print buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {lastUpdated && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" />
                  {lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {canSeePdfButton && incident.satgasPdfKey && (
                <button
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm bg-red-500 text-white font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                  {downloadingPdf ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  PDF Satgas
                </button>
              )}
              <button
                onClick={handlePrint}
                title="Buka tampilan cetak HTML"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Cetak
              </button>
            </div>
          </div>

          {/* Action bar */}
          {viewerId && (
            <div className="mt-4 pt-4 border-t border-sky-50 dark:border-sky-900/50">
              <IncidentActionBar
                incidentId={incidentId}
                status={incident.status}
                reportedById={incident.reportedById}
                claimedById={incident.claimedById}
                createdAt={incident.createdAt}
                viewerId={viewerId}
                viewerRole={viewerRole}
                viewerIsSafeguardOfficer={viewerIsSGO}
                onActionComplete={handleActionComplete}
              />
            </div>
          )}
        </div>

        {/* 2-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: incident details */}
          <div className="lg:col-span-2 space-y-4">
            {/* Core metadata */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4 text-sky-500" />
                Detail Insiden
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <MetaItem label="Tipe Insiden" value={TYPE_LABELS[incident.type] ?? incident.type} />
                <MetaItem label="Waktu Kejadian" value={formatDate(incident.occurredAt)} />
                <MetaItem
                  label="Dilaporkan Oleh"
                  value={incident.reportedByName ?? incident.reportedById}
                />
                <MetaItem
                  label="Ditangani Oleh"
                  value={incident.claimedByName ?? (incident.claimedById ? 'Ada' : '—')}
                />
                {incident.affectedUserName && (
                  <MetaItem label="Pihak Terdampak" value={incident.affectedUserName} />
                )}
                {incident.additionalAffectedUserIds.length > 0 && (
                  <MetaItem
                    label="Terdampak Tambahan"
                    value={`${incident.additionalAffectedUserIds.length} orang`}
                  />
                )}
                {incident.claimedAt && (
                  <MetaItem label="Di-claim" value={formatDate(incident.claimedAt)} />
                )}
                {incident.resolvedAt && (
                  <MetaItem label="Diselesaikan" value={formatDate(incident.resolvedAt)} />
                )}
              </div>

              {incident.actionTaken && (
                <div className="mt-4">
                  <MetaItem label="Tindakan Awal">
                    <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-slate-700 rounded-xl p-3 mt-1">
                      {incident.actionTaken}
                    </p>
                  </MetaItem>
                </div>
              )}
            </div>

            {/* Resolution / Retraction / Escalation details */}
            {incident.resolutionNote && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-2">
                  Catatan Resolusi
                </h2>
                <p className="text-sm text-gray-700 dark:text-gray-300">{incident.resolutionNote}</p>
              </div>
            )}

            {incident.escalationReason && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800 p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                  Eskalasi ke{' '}
                  {ESCALATION_TARGET_LABELS[incident.escalatedTo ?? ''] ?? incident.escalatedTo}
                </h2>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  {incident.escalationReason}
                </p>
                {incident.satgasTicketRef && (
                  <p className="text-xs text-gray-500">Tiket: {incident.satgasTicketRef}</p>
                )}
                {incident.escalatedAt && (
                  <p className="text-xs text-gray-400 mt-1">
                    Dieskalasi {formatDate(incident.escalatedAt)}
                  </p>
                )}
              </div>
            )}

            {incident.retractedAt && (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
                  Insiden Ditarik
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {incident.retractionReason ?? '—'}
                </p>
                <p className="text-xs text-gray-400 mt-1">{formatDate(incident.retractedAt)}</p>
              </div>
            )}

            {/* Attachments */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">
                Lampiran
              </h2>
              <IncidentAttachmentList
                incidentId={incidentId}
                attachmentKeys={incident.attachmentKeys}
                canUpload={canUploadAttachment && !isTerminal}
                onUploaded={handleActionComplete}
              />
            </div>
          </div>

          {/* Right: timeline */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Kronologi
                </h2>
                <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-full px-2 py-0.5">
                  {timeline.length}
                </span>
              </div>
              <IncidentTimeline entries={timeline} loading={timelineLoading} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
