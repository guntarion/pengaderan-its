'use client';

/**
 * /dashboard/konsekuensi/[id]
 * NAWASENA M10 — Maba consequence detail page.
 *
 * Shows consequence details + type-specific submit form:
 *   REFLEKSI_500_KATA  : Textarea with 500-word minimum counter
 *   PRESENTASI_ULANG   : Upload file field + notes
 *   TUGAS_PENGABDIAN   : Notes/description field
 *   POIN_PASSPORT_DIKURANGI : Read-only (no submit; automatic passport cascade)
 *   PERINGATAN_TERTULIS    : Read-only (acknowledges)
 *
 * Uses EducationalBanner (permanent, non-dismissible per Permen 55/2024).
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Info,
  Loader2,
} from 'lucide-react';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { Badge } from '@/components/ui/badge';
import { EducationalBanner } from '@/components/safeguard/EducationalBanner';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { cn } from '@/lib/utils';

const log = createLogger('konsekuensi-detail-page');

// ---- Types ----

interface ConsequenceDetail {
  id: string;
  type: string;
  status: string;
  reasonText: string;
  deadline: string | null;
  pointsDeducted: number | null;
  createdAt: string;
  updatedAt: string;
  targetUserId: string;
  notesAfter?: string | null;
  reviewNote?: string | null;
  reviewedAt?: string | null;
  reviewedById?: string | null;
  passportCascadeStatus?: string | null;
  relatedIncidentId?: string | null;
  forbiddenActCode?: string | null;
}

// ---- Label maps ----

const TYPE_LABELS: Record<string, string> = {
  REFLEKSI_500_KATA: 'Refleksi 500 Kata',
  PRESENTASI_ULANG: 'Presentasi Ulang',
  POIN_PASSPORT_DIKURANGI: 'Pengurangan Poin Passport',
  PERINGATAN_TERTULIS: 'Peringatan Tertulis',
  TUGAS_PENGABDIAN: 'Tugas Pengabdian',
};

const STATUS_LABELS: Record<string, string> = {
  ASSIGNED: 'Perlu Dikerjakan',
  NEEDS_REVISION: 'Perlu Revisi',
  PENDING_REVIEW: 'Menunggu Review',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
  OVERDUE: 'Terlambat',
};

const STATUS_STYLES: Record<string, string> = {
  ASSIGNED: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900/30 dark:text-sky-300',
  NEEDS_REVISION: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300',
  PENDING_REVIEW: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300',
  APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300',
  REJECTED: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300',
  OVERDUE: 'bg-red-100 text-red-900 border-red-400 dark:bg-red-900/40 dark:text-red-300',
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

function wordCount(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

function isOverdue(deadline: string | null, status: string) {
  if (!deadline) return false;
  if (['APPROVED', 'REJECTED', 'PENDING_REVIEW'].includes(status)) return false;
  return new Date(deadline) < new Date();
}

// ---- Refleksi submit form ----

function RefleksiForm({
  consequenceId,
  existingNotes,
  onSubmitted,
}: {
  consequenceId: string;
  existingNotes?: string | null;
  onSubmitted: () => void;
}) {
  const [text, setText] = useState(existingNotes ?? '');
  const [submitting, setSubmitting] = useState(false);
  const wc = wordCount(text);
  const isValid = wc >= 500;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/safeguard/consequences/${consequenceId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notesAfter: text }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message ?? 'Gagal submit');
      }
      toast.success('Refleksi berhasil dikirim untuk di-review');
      log.info('Refleksi submitted', { consequenceId });
      onSubmitted();
    } catch (err) {
      toast.apiError(err);
      log.error('Submit failed', { consequenceId, error: err });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Tuliskan refleksi Anda
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full min-h-[320px] rounded-xl border border-sky-100 dark:border-sky-800 bg-white dark:bg-slate-700 p-3 text-sm text-gray-700 dark:text-gray-300 resize-y focus:outline-none focus:ring-2 focus:ring-sky-400"
          placeholder="Tulis refleksi Anda di sini, minimal 500 kata..."
        />
        <div className="flex justify-between mt-2">
          <p
            className={cn(
              'text-sm font-medium',
              isValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
            )}
          >
            {wc} kata {isValid ? '✓' : `(kurang ${500 - wc} kata lagi)`}
          </p>
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 w-8 rounded-full transition-colors',
                  wc >= (i + 1) * 100
                    ? isValid
                      ? 'bg-emerald-400'
                      : 'bg-sky-400'
                    : 'bg-gray-200 dark:bg-gray-600',
                )}
              />
            ))}
          </div>
        </div>
      </div>
      <button
        type="submit"
        disabled={!isValid || submitting}
        className="w-full py-2.5 rounded-xl bg-sky-500 text-white font-medium text-sm hover:bg-sky-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Kirim Refleksi untuk Review
      </button>
    </form>
  );
}

// ---- Generic task form (presentasi + tugas_pengabdian) ----

function GenericTaskForm({
  consequenceId,
  existingNotes,
  placeholder,
  minLength,
  minLengthLabel,
  onSubmitted,
}: {
  consequenceId: string;
  existingNotes?: string | null;
  placeholder: string;
  minLength: number;
  minLengthLabel: string;
  onSubmitted: () => void;
}) {
  const [text, setText] = useState(existingNotes ?? '');
  const [submitting, setSubmitting] = useState(false);
  const isValid = text.trim().length >= minLength;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/safeguard/consequences/${consequenceId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notesAfter: text }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message ?? 'Gagal submit');
      }
      toast.success('Berhasil dikirim untuk di-review');
      log.info('Task submitted', { consequenceId });
      onSubmitted();
    } catch (err) {
      toast.apiError(err);
      log.error('Submit failed', { consequenceId, error: err });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Deskripsi Penyelesaian
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full min-h-[200px] rounded-xl border border-sky-100 dark:border-sky-800 bg-white dark:bg-slate-700 p-3 text-sm text-gray-700 dark:text-gray-300 resize-y focus:outline-none focus:ring-2 focus:ring-sky-400"
          placeholder={placeholder}
        />
        {!isValid && text.length > 0 && (
          <p className="text-xs text-amber-600 mt-1">{minLengthLabel}</p>
        )}
      </div>
      <button
        type="submit"
        disabled={!isValid || submitting}
        className="w-full py-2.5 rounded-xl bg-sky-500 text-white font-medium text-sm hover:bg-sky-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Kirim untuk Review
      </button>
    </form>
  );
}

// ---- Main page ----

export default function KonsekuensiDetailPage() {
  const params = useParams();
  const consequenceId = params.id as string;
  const router = useRouter();

  const [consequence, setConsequence] = useState<ConsequenceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConsequence = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/safeguard/consequences/${consequenceId}`);
      if (!res.ok) {
        if (res.status === 403) {
          router.replace('/dashboard/konsekuensi');
          return;
        }
        if (res.status === 404) {
          setError('Konsekuensi tidak ditemukan');
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const { data } = await res.json();
      setConsequence(data);
    } catch (err) {
      log.error('Failed to fetch consequence', { consequenceId, error: err });
      setError('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, [consequenceId, router]);

  useEffect(() => {
    fetchConsequence();
  }, [fetchConsequence]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <SkeletonCard className="h-12" />
          <SkeletonCard className="h-48" />
          <SkeletonCard className="h-64" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 text-center shadow-sm max-w-sm">
          <p className="text-red-500 font-medium mb-3">{error}</p>
          <Link href="/dashboard/konsekuensi" className="text-sm text-sky-600 hover:text-sky-700">
            Kembali ke daftar
          </Link>
        </div>
      </div>
    );
  }

  if (!consequence) return null;

  const actualStatus = isOverdue(consequence.deadline, consequence.status)
    ? 'OVERDUE'
    : consequence.status;

  const canSubmit = ['ASSIGNED', 'NEEDS_REVISION'].includes(consequence.status);
  const isReadOnly = ['POIN_PASSPORT_DIKURANGI', 'PERINGATAN_TERTULIS'].includes(consequence.type);
  const isApproved = consequence.status === 'APPROVED';

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <DynamicBreadcrumb
          labels={{
            konsekuensi: 'Konsekuensi Saya',
            [consequenceId]: TYPE_LABELS[consequence?.type ?? ''] ?? 'Detail',
          }}
          homeHref="/dashboard"
        />

        {/* Header card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <Link
              href="/dashboard/konsekuensi"
              className="mt-0.5 p-1.5 rounded-lg text-gray-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {TYPE_LABELS[consequence.type] ?? consequence.type}
                </h1>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs border',
                    STATUS_STYLES[actualStatus] ?? 'bg-gray-100 text-gray-700',
                  )}
                >
                  {STATUS_LABELS[actualStatus] ?? actualStatus}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Diberikan {formatDate(consequence.createdAt)}
              </p>
            </div>
          </div>

          {/* Key metadata */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            {consequence.deadline && (
              <div>
                <p className="text-xs text-gray-400 uppercase font-medium">Deadline</p>
                <p
                  className={cn(
                    'text-sm font-semibold mt-0.5',
                    isOverdue(consequence.deadline, consequence.status)
                      ? 'text-red-500'
                      : 'text-amber-600 dark:text-amber-400',
                  )}
                >
                  {formatDate(consequence.deadline)}
                </p>
              </div>
            )}
            {consequence.pointsDeducted && (
              <div>
                <p className="text-xs text-gray-400 uppercase font-medium">Poin Dikurangi</p>
                <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 mt-0.5">
                  -{consequence.pointsDeducted} poin passport
                </p>
              </div>
            )}
            {consequence.passportCascadeStatus && (
              <div>
                <p className="text-xs text-gray-400 uppercase font-medium">Status Passport</p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-0.5">
                  {consequence.passportCascadeStatus}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Educational Banner — PERMANENT, NON-DISMISSIBLE */}
        <EducationalBanner />

        {/* Reason card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <Info className="h-4 w-4 text-sky-500" />
            Alasan Konsekuensi
          </h2>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {consequence.reasonText}
          </p>
          {consequence.relatedIncidentId && (
            <Link
              href={`/dashboard/safeguard/incidents/${consequence.relatedIncidentId}`}
              className="mt-3 text-xs text-sky-600 hover:text-sky-700 dark:text-sky-400 flex items-center gap-1"
            >
              Lihat insiden terkait &rarr;
            </Link>
          )}
        </div>

        {/* Review feedback (if needs revision or rejected) */}
        {(['NEEDS_REVISION', 'REJECTED'].includes(consequence.status)) && consequence.reviewNote && (
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800 p-4">
            <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Catatan Reviewer
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300">{consequence.reviewNote}</p>
          </div>
        )}

        {/* Approved confirmation */}
        {isApproved && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                Konsekuensi Disetujui
              </p>
              {consequence.reviewedAt && (
                <p className="text-xs text-gray-500">{formatDate(consequence.reviewedAt)}</p>
              )}
            </div>
          </div>
        )}

        {/* Previously submitted notes */}
        {consequence.notesAfter && !canSubmit && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Jawaban / Laporan yang Dikumpulkan
            </h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {consequence.notesAfter}
            </p>
          </div>
        )}

        {/* Submit form — only for submittable types when canSubmit */}
        {canSubmit && !isReadOnly && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">
              {consequence.status === 'NEEDS_REVISION'
                ? 'Revisi dan Kirim Ulang'
                : 'Kumpulkan Tugas'}
            </h2>

            {consequence.type === 'REFLEKSI_500_KATA' && (
              <RefleksiForm
                consequenceId={consequenceId}
                existingNotes={consequence.notesAfter}
                onSubmitted={fetchConsequence}
              />
            )}

            {consequence.type === 'PRESENTASI_ULANG' && (
              <GenericTaskForm
                consequenceId={consequenceId}
                existingNotes={consequence.notesAfter}
                placeholder="Jelaskan kapan, di mana, dan kepada siapa presentasi ulang dilakukan. Sertakan ringkasan materi yang dipresentasikan."
                minLength={50}
                minLengthLabel="Deskripsi minimal 50 karakter"
                onSubmitted={fetchConsequence}
              />
            )}

            {consequence.type === 'TUGAS_PENGABDIAN' && (
              <GenericTaskForm
                consequenceId={consequenceId}
                existingNotes={consequence.notesAfter}
                placeholder="Jelaskan kegiatan pengabdian yang telah dilakukan, termasuk waktu, tempat, dan dokumentasi kegiatan."
                minLength={100}
                minLengthLabel="Laporan pengabdian minimal 100 karakter"
                onSubmitted={fetchConsequence}
              />
            )}
          </div>
        )}

        {/* Read-only types: passport deduction + peringatan */}
        {isReadOnly && (
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
              <div>
                {consequence.type === 'POIN_PASSPORT_DIKURANGI' ? (
                  <>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Pengurangan poin passport telah diproses
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Pengurangan -{consequence.pointsDeducted} poin dilakukan secara otomatis pada
                      Passport Digital Anda. Tidak diperlukan tindakan dari Anda.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Peringatan Tertulis
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Peringatan ini telah tercatat. Tidak diperlukan tindakan dari Anda.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pending review message */}
        {consequence.status === 'PENDING_REVIEW' && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-800 p-4 flex items-center gap-3">
            <RefreshCw className="h-5 w-5 text-blue-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                Menunggu Review SC
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-500">
                Jawaban Anda sedang ditinjau. Anda akan mendapatkan notifikasi hasilnya.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
