'use client';

/**
 * src/app/(DashboardLayout)/dashboard/blm/triwulan/[reviewId]/audit-substansi/page.tsx
 * NAWASENA M14 — BLM: Audit Substansi page.
 *
 * Lists all 10 muatan wajib items for BLM to assess, then acknowledge or request revision.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { ReviewStatusBadge } from '@/components/triwulan/ReviewStatusBadge';
import { EscalationFlagBanner } from '@/components/triwulan/EscalationFlagBanner';
import { AuditSubstansiChecklist } from '@/components/triwulan/AuditSubstansiChecklist';
import { RevisionReasonDialog } from '@/components/triwulan/RevisionReasonDialog';
import { NarrativeEditor } from '@/components/triwulan/NarrativeEditor';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import {
  ClipboardCheck,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Loader2,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReviewStatus, TriwulanEscalationLevel, EscalationRuleKey, MuatanWajibKey, MuatanCoverageStatus } from '@prisma/client';

const log = createLogger('m14/blm/triwulan/audit-substansi');
const QUARTER_LABELS = ['', 'Triwulan I', 'Triwulan II', 'Triwulan III', 'Triwulan IV'];

interface AuditItem {
  key: MuatanWajibKey;
  label: string;
  description: string;
  result: {
    id: string | null;
    coverage: MuatanCoverageStatus;
    evidenceRef: string | null;
    notes: string | null;
    assessedAt: string | null;
    assessedBy: { displayName: string | null; fullName: string | null } | null;
  };
}

interface ReviewMeta {
  id: string;
  quarterNumber: number;
  status: ReviewStatus;
  escalationLevel: TriwulanEscalationLevel;
  executiveSummary: string | null;
  cohort: { id: string; code: string; name: string };
  dataSnapshotJsonb: Record<string, unknown>;
}

export default function BLMAuditSubstansiPage() {
  const params = useParams<{ reviewId: string }>();
  const router = useRouter();

  const [meta, setMeta] = useState<ReviewMeta | null>(null);
  const [items, setItems] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState(false);
  const [showRevisionDialog, setShowRevisionDialog] = useState(false);
  const [ackNotes, setAckNotes] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      log.info('Fetching audit substansi data', { reviewId: params.reviewId });

      const [reviewRes, itemsRes] = await Promise.all([
        fetch(`/api/triwulan/${params.reviewId}`),
        fetch(`/api/triwulan/${params.reviewId}/blm-audit-item`),
      ]);

      if (!reviewRes.ok) {
        const data = await reviewRes.json();
        toast.apiError(data);
        return;
      }
      if (!itemsRes.ok) {
        const data = await itemsRes.json();
        toast.apiError(data);
        return;
      }

      const reviewData = await reviewRes.json();
      const itemsData = await itemsRes.json();

      setMeta(reviewData.data);
      setItems(itemsData.data ?? []);
    } catch (err) {
      toast.apiError(err);
    } finally {
      setLoading(false);
    }
  }, [params.reviewId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const assessedCount = items.filter(
    (i) => i.result.coverage !== MuatanCoverageStatus.NOT_ASSESSED
  ).length;
  const allAssessed = assessedCount >= items.length && items.length > 0;

  const handleAcknowledge = async () => {
    if (!allAssessed) {
      toast.error(`Semua ${items.length} muatan wajib harus dinilai sebelum mengakui review`);
      return;
    }

    setAcknowledging(true);
    try {
      const res = await fetch(`/api/triwulan/${params.reviewId}/blm-acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: ackNotes }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.apiError(data);
        return;
      }
      toast.success('Review berhasil diakui. PDF sedang diproses.');
      router.push('/dashboard/blm/triwulan');
    } catch (err) {
      toast.apiError(err);
    } finally {
      setAcknowledging(false);
    }
  };

  const handleRevision = async (reason: string) => {
    const res = await fetch(`/api/triwulan/${params.reviewId}/blm-request-revision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const data = await res.json();
      toast.apiError(data);
      throw new Error('Revision request failed');
    }
    toast.success('Permintaan revisi dikirim ke SC');
    router.push('/dashboard/blm/triwulan');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
        <div className="bg-gradient-to-r from-sky-500 to-blue-600 h-28" />
        <div className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!meta) return null;

  const snap = meta.dataSnapshotJsonb ?? {};
  const escalationFlags = (snap.escalationFlags as EscalationRuleKey[]) ?? [];
  const canAct = meta.status === ReviewStatus.PEMBINA_SIGNED;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <DynamicBreadcrumb
            homeLabel="Dashboard"
            homeHref="/dashboard"
            className="text-white/70 mb-3 text-sm"
          />
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <ClipboardCheck className="h-6 w-6" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">
                    {QUARTER_LABELS[meta.quarterNumber]} — {meta.cohort.code}
                  </h1>
                  <ReviewStatusBadge status={meta.status} className="border border-white/30" />
                </div>
                <p className="text-sm text-white/70">{meta.cohort.name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
        {/* Escalation */}
        {escalationFlags.length > 0 && (
          <EscalationFlagBanner
            level={meta.escalationLevel}
            flags={escalationFlags}
          />
        )}

        {/* Narrative (read-only for BLM) */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-sky-500" />
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">
              Narasi Eksekutif SC
            </h2>
          </div>
          <NarrativeEditor
            reviewId={params.reviewId}
            initialNarrative={meta.executiveSummary ?? ''}
            readonly
          />
        </div>

        {/* Audit substansi checklist */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardCheck className="h-4 w-4 text-sky-500" />
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">
              10 Muatan Wajib
            </h2>
          </div>
          <AuditSubstansiChecklist
            reviewId={params.reviewId}
            items={items}
            readonly={!canAct}
            onItemSaved={(key, coverage) => {
              setItems((prev) =>
                prev.map((item) =>
                  item.key === key
                    ? { ...item, result: { ...item.result, coverage } }
                    : item
                )
              );
            }}
          />
        </div>

        {/* Acknowledge action */}
        {canAct && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 space-y-3">
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">
              Pengakuan BLM
            </h2>

            {!allAssessed && (
              <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Nilai semua {items.length} muatan wajib sebelum mengakui review (
                  {assessedCount}/{items.length} sudah dinilai).
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Catatan BLM (opsional)
              </label>
              <textarea
                value={ackNotes}
                onChange={(e) => setAckNotes(e.target.value)}
                rows={3}
                placeholder="Catatan pengakuan dari BLM..."
                className="w-full px-4 py-3 text-sm rounded-xl border border-sky-200 dark:border-sky-800 bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRevisionDialog(true)}
                className="rounded-xl"
              >
                <RefreshCw className="h-4 w-4 mr-1.5" />
                Minta Revisi
              </Button>
              <Button
                type="button"
                onClick={handleAcknowledge}
                disabled={!allAssessed || acknowledging}
                className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {acknowledging ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Memproses...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Akui Review
                  </span>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Revision dialog */}
      <RevisionReasonDialog
        open={showRevisionDialog}
        onClose={() => setShowRevisionDialog(false)}
        onConfirm={handleRevision}
        title="Minta Revisi ke SC"
        description="Berikan alasan yang jelas mengapa review ini perlu direvisi oleh SC."
      />
    </div>
  );
}
