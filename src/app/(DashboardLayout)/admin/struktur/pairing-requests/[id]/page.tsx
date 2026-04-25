'use client';

/**
 * /admin/struktur/pairing-requests/[id]
 * SC/SUPERADMIN — detail + actions (approve, reject, fulfill).
 */

import { useEffect, useState, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { useConfirm } from '@/hooks/useConfirm';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { ClipboardList, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';

const log = createLogger('admin-pairing-request-detail');

interface PairingRequestDetail {
  id: string;
  type: string;
  status: string;
  optionalNote: string | null;
  preferenceHint: unknown;
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
  cohort: { id: string; code: string; name: string };
  requester: { id: string; fullName: string; displayName: string; nrp: string };
  subject: { id: string; fullName: string; displayName: string } | null;
  resolvedBy: { id: string; fullName: string; displayName: string } | null;
  currentKasuhPair: {
    id: string;
    kasuh: { id: string; fullName: string; displayName: string };
  } | null;
}

const statusColor = (s: string) => {
  switch (s) {
    case 'PENDING': return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'APPROVED': return 'bg-sky-100 text-sky-800 border-sky-300';
    case 'FULFILLED': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'REJECTED': return 'bg-red-100 text-red-800 border-red-300';
    default: return 'bg-gray-100 text-gray-700 border-gray-300';
  }
};

export default function PairingRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();
  const [request, setRequest] = useState<PairingRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectNote, setRejectNote] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [newKasuhUserId, setNewKasuhUserId] = useState('');
  const [showFulfillForm, setShowFulfillForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRequest = useCallback(async () => {
    try {
      log.info('Fetching pairing request detail', { id });
      // Use the queue endpoint filtered by specific request
      // For detail view we use the list endpoint and pick first match
      // In a real app we'd have GET /api/admin/struktur/pairing-requests/[id]
      // For now we load from list (all statuses) and filter
      const res = await fetch(`/api/admin/struktur/pairing-requests?status=PENDING`);
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      const json = await res.json();
      const found = (json.data ?? []).find((r: PairingRequestDetail) => r.id === id);
      if (found) {
        setRequest(found);
      } else {
        // Try other statuses
        const res2 = await fetch(`/api/admin/struktur/pairing-requests?status=APPROVED`);
        if (res2.ok) {
          const json2 = await res2.json();
          const found2 = (json2.data ?? []).find((r: PairingRequestDetail) => r.id === id);
          if (found2) setRequest(found2);
        }
      }
    } catch (err) {
      log.error('Failed to fetch pairing request', { err });
      toast.error('Gagal memuat detail request');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchRequest(); }, [fetchRequest]);

  async function handleApprove() {
    const confirmed = await confirm({
      title: 'Approve Request?',
      description: 'Request akan disetujui. SC perlu melanjutkan dengan memilih Kasuh baru.',
      confirmLabel: 'Approve',
    });
    if (!confirmed) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/struktur/pairing-requests/${id}/approve`, { method: 'POST' });
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      toast.success('Request berhasil di-approve');
      await fetchRequest();
    } catch (err) {
      log.error('Failed to approve', { err });
      toast.error('Gagal approve request');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!rejectNote.trim()) {
      toast.error('Alasan penolakan wajib diisi');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/struktur/pairing-requests/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolutionNote: rejectNote }),
      });
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      toast.success('Request berhasil ditolak');
      setShowRejectForm(false);
      await fetchRequest();
    } catch (err) {
      log.error('Failed to reject', { err });
      toast.error('Gagal menolak request');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleFulfill() {
    if (!newKasuhUserId.trim()) {
      toast.error('Masukkan ID Kasuh baru');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/struktur/pairing-requests/${id}/fulfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newKasuhUserId }),
      });
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      toast.success('Request berhasil dipenuhi — Kasuh baru telah di-assign');
      setShowFulfillForm(false);
      await fetchRequest();
    } catch (err) {
      log.error('Failed to fulfill', { err });
      toast.error('Gagal memenuhi request');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <DynamicBreadcrumb labels={{ [id]: 'Detail Request' }} />
        <SkeletonCard />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="p-6">
        <DynamicBreadcrumb />
        <p className="text-gray-500 mt-4">Pairing request tidak ditemukan.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <DynamicBreadcrumb labels={{ [id]: 'Detail Request' }} />

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shrink-0">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Pairing Request</h1>
            <Badge className={`text-xs ${statusColor(request.status)}`}>{request.status}</Badge>
            <Badge className="text-xs bg-violet-100 text-violet-800 border-violet-200">
              {request.type === 'RE_PAIR_KASUH' ? 'Re-Pair Kasuh' : 'Kasuh Unreachable'}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Diajukan: {new Date(request.createdAt).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 mb-1">Pemohon</p>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {request.requester?.displayName ?? request.requester?.fullName}
          </p>
          <p className="text-xs text-gray-400">{request.requester?.nrp}</p>
        </div>
        <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 mb-1">Kohort</p>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {request.cohort?.name ?? request.cohort?.code}
          </p>
        </div>
        {request.currentKasuhPair && (
          <div className="rounded-2xl border border-amber-100 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/10 p-4 shadow-sm">
            <p className="text-xs font-medium text-amber-700 mb-1">Kasuh Saat Ini</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {request.currentKasuhPair.kasuh?.displayName ?? request.currentKasuhPair.kasuh?.fullName}
            </p>
          </div>
        )}
      </div>

      {/* Optional note */}
      {request.optionalNote && (
        <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 mb-1">Catatan dari MABA</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{request.optionalNote}</p>
        </div>
      )}

      {/* Resolution note */}
      {request.resolutionNote && (
        <div className={`rounded-2xl border p-4 shadow-sm ${
          request.status === 'REJECTED'
            ? 'border-red-100 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10'
            : 'border-emerald-100 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/10'
        }`}>
          <p className={`text-xs font-medium mb-1 ${request.status === 'REJECTED' ? 'text-red-600' : 'text-emerald-600'}`}>
            Catatan Resolusi
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{request.resolutionNote}</p>
          {request.resolvedBy && (
            <p className="text-xs text-gray-400 mt-1">
              oleh {request.resolvedBy.displayName ?? request.resolvedBy.fullName}
              {request.resolvedAt && ` — ${new Date(request.resolvedAt).toLocaleDateString('id-ID')}`}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      {(request.status === 'PENDING' || request.status === 'APPROVED') && (
        <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tindakan SC</h2>

          {request.status === 'PENDING' && (
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleApprove}
                disabled={actionLoading}
                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setShowRejectForm((v) => !v)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
          )}

          {showRejectForm && (
            <div className="space-y-2">
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Alasan penolakan (wajib)..."
                rows={3}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
              <Button
                onClick={handleReject}
                disabled={actionLoading || !rejectNote.trim()}
                className="bg-red-500 hover:bg-red-600 text-white rounded-xl"
              >
                Konfirmasi Penolakan
              </Button>
            </div>
          )}

          {request.status === 'APPROVED' && (
            <div className="space-y-3">
              <p className="text-sm text-sky-700 dark:text-sky-400">
                Request telah disetujui. Pilih Kasuh baru untuk memenuhi request ini.
              </p>
              <Button
                variant="outline"
                onClick={() => setShowFulfillForm((v) => !v)}
              >
                Pilih Kasuh Baru & Fulfill
              </Button>
              {showFulfillForm && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newKasuhUserId}
                    onChange={(e) => setNewKasuhUserId(e.target.value)}
                    placeholder="User ID Kasuh baru..."
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                  <Button
                    onClick={handleFulfill}
                    disabled={actionLoading || !newKasuhUserId.trim()}
                    className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl"
                  >
                    Fulfill Request
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <Button variant="outline" onClick={() => router.push('/admin/struktur/pairing-requests')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Kembali ke Antrian
      </Button>

      <ConfirmDialog />
    </div>
  );
}
