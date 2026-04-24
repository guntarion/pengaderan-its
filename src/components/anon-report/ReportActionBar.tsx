'use client';

/**
 * src/components/anon-report/ReportActionBar.tsx
 * NAWASENA M12 — Conditional action buttons based on report status and user role.
 *
 * Conditions:
 *   NEW + BLM → "Akui Laporan"
 *   IN_REVIEW + BLM → "Selesaikan", "Teruskan ke Satgas", "Tambah Catatan"
 *   IN_REVIEW + Satgas → "Selesaikan", "Tambah Catatan Satgas"
 *   ESCALATED_TO_SATGAS + Satgas → "Selesaikan", "Tambah Catatan Satgas"
 *   RESOLVED → read-only (no actions)
 */

import { useState } from 'react';
import { useConfirm } from '@/hooks/useConfirm';
import { toast } from '@/lib/toast';
import { CheckCircle2, ShieldAlert, MessageSquare } from 'lucide-react';
import { AnonStatus } from '@prisma/client';
import { createLogger } from '@/lib/logger';

const log = createLogger('report-action-bar');

export interface ReportActionBarProps {
  reportId: string;
  status: AnonStatus;
  userRole: string;
  satgasEscalated: boolean;
  onStatusChange?: (newStatus: AnonStatus) => void;
  onNoteAdded?: () => void;
}

interface NoteFormProps {
  reportId: string;
  noteType: 'internal' | 'public' | 'satgas';
  onSuccess: () => void;
  onCancel: () => void;
}

function NoteForm({ reportId, noteType, onSuccess, onCancel }: NoteFormProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const NOTE_TYPE_LABELS: Record<string, string> = {
    internal: 'internal',
    public: 'publik (terlihat pelapor)',
    satgas: 'Satgas',
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/anon-reports/${reportId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: noteType, content }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error?.message);
      toast.success('Catatan berhasil ditambahkan');
      onSuccess();
    } catch (err) {
      log.error('Failed to add note', { error: err });
      toast.apiError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-sky-100 bg-sky-50 p-4 dark:border-sky-900 dark:bg-sky-950/20">
      <p className="mb-2 text-xs font-semibold text-sky-700 dark:text-sky-400">
        Tambah catatan {NOTE_TYPE_LABELS[noteType]}
      </p>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        className="w-full rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-sky-400 focus:outline-none dark:border-sky-800 dark:bg-gray-900 dark:text-gray-300"
        placeholder="Tulis catatan..."
      />
      <div className="mt-2 flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={loading || !content.trim()}
          className="rounded-xl bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
        >
          {loading ? 'Menyimpan...' : 'Simpan'}
        </button>
        <button
          onClick={onCancel}
          className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          Batal
        </button>
      </div>
    </div>
  );
}

interface ResolveFormProps {
  reportId: string;
  onSuccess: (status: AnonStatus) => void;
  onCancel: () => void;
}

function ResolveForm({ reportId, onSuccess, onCancel }: ResolveFormProps) {
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [publicNote, setPublicNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (resolutionNotes.trim().length < 10) {
      toast.error('Catatan resolusi minimal 10 karakter');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/anon-reports/${reportId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolutionNotes, publicNote: publicNote || undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error?.message);
      toast.success('Laporan berhasil diselesaikan');
      onSuccess(AnonStatus.RESOLVED);
    } catch (err) {
      log.error('Failed to resolve report', { error: err });
      toast.apiError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-green-100 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/20">
      <p className="mb-3 text-xs font-semibold text-green-700 dark:text-green-400">
        Selesaikan Laporan
      </p>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
            Catatan Resolusi (wajib, min. 10 karakter)
          </label>
          <textarea
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-green-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-green-400 focus:outline-none dark:border-green-800 dark:bg-gray-900 dark:text-gray-300"
            placeholder="Tuliskan tindakan yang diambil..."
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
            Catatan Publik (opsional, terlihat oleh pelapor, maks 300 kar.)
          </label>
          <textarea
            value={publicNote}
            onChange={(e) => setPublicNote(e.target.value)}
            rows={2}
            maxLength={300}
            className="w-full rounded-xl border border-green-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-green-400 focus:outline-none dark:border-green-800 dark:bg-gray-900 dark:text-gray-300"
            placeholder="Pesan singkat untuk pelapor (opsional)..."
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={loading || resolutionNotes.trim().length < 10}
            className="rounded-xl bg-green-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? 'Menyimpan...' : 'Selesaikan'}
          </button>
          <button
            onClick={onCancel}
            className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}

export function ReportActionBar({
  reportId,
  status,
  userRole,
  satgasEscalated,
  onStatusChange,
  onNoteAdded,
}: ReportActionBarProps) {
  const { confirm, ConfirmDialog } = useConfirm();
  const [showNoteForm, setShowNoteForm] = useState<'internal' | 'public' | 'satgas' | null>(null);
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const isBLM = userRole === 'BLM' || userRole === 'SUPERADMIN';
  const isSatgas = userRole === 'SATGAS' || userRole === 'SUPERADMIN';

  const handleAcknowledge = async () => {
    const ok = await confirm(
      'Akui laporan ini?',
      'Laporan akan masuk status "Sedang Ditinjau". Tindakan ini tidak dapat dibatalkan.',
    );
    if (!ok) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/anon-reports/${reportId}/acknowledge`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error?.message);
      toast.success('Laporan berhasil diakui');
      onStatusChange?.(AnonStatus.IN_REVIEW);
    } catch (err) {
      log.error('Failed to acknowledge report', { error: err });
      toast.apiError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEscalate = async () => {
    const ok = await confirm(
      'Teruskan ke Satgas PPKPT?',
      'Laporan akan diteruskan ke Satgas PPKPT ITS untuk penanganan lebih lanjut. Tindakan ini tidak dapat dibatalkan.',
    );
    if (!ok) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/anon-reports/${reportId}/escalate`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error?.message);
      toast.success('Laporan berhasil diteruskan ke Satgas');
      onStatusChange?.(AnonStatus.ESCALATED_TO_SATGAS);
    } catch (err) {
      log.error('Failed to escalate report', { error: err });
      toast.apiError(err);
    } finally {
      setLoading(false);
    }
  };

  // RESOLVED — no actions
  if (status === AnonStatus.RESOLVED) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/20 dark:text-green-400">
        <CheckCircle2 className="h-4 w-4" />
        Laporan telah diselesaikan.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ConfirmDialog />

      {/* NEW + BLM → Acknowledge */}
      {status === AnonStatus.NEW && isBLM && (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleAcknowledge}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            Akui Laporan
          </button>
          {!satgasEscalated && (
            <button
              onClick={handleEscalate}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-semibold text-orange-700 hover:bg-orange-100 disabled:opacity-50 dark:border-orange-800 dark:bg-orange-950/20 dark:text-orange-400"
            >
              <ShieldAlert className="h-4 w-4" />
              Teruskan ke Satgas
            </button>
          )}
        </div>
      )}

      {/* IN_REVIEW + BLM → Resolve, Escalate, Add Note */}
      {status === AnonStatus.IN_REVIEW && isBLM && (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowResolveForm(true)}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            Selesaikan
          </button>
          {!satgasEscalated && (
            <button
              onClick={handleEscalate}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-semibold text-orange-700 hover:bg-orange-100 disabled:opacity-50 dark:border-orange-800 dark:bg-orange-950/20 dark:text-orange-400"
            >
              <ShieldAlert className="h-4 w-4" />
              Teruskan ke Satgas
            </button>
          )}
          <button
            onClick={() => setShowNoteForm(showNoteForm === 'internal' ? null : 'internal')}
            className="flex items-center gap-2 rounded-xl border border-sky-200 px-4 py-2.5 text-sm font-medium text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:text-sky-400 dark:hover:bg-sky-950/20"
          >
            <MessageSquare className="h-4 w-4" />
            Tambah Catatan
          </button>
        </div>
      )}

      {/* ESCALATED_TO_SATGAS + Satgas → Resolve, Add Satgas Note */}
      {(status === AnonStatus.ESCALATED_TO_SATGAS || status === AnonStatus.IN_REVIEW) &&
        isSatgas && !isBLM && (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowResolveForm(true)}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              Selesaikan
            </button>
            <button
              onClick={() => setShowNoteForm(showNoteForm === 'satgas' ? null : 'satgas')}
              className="flex items-center gap-2 rounded-xl border border-orange-200 px-4 py-2.5 text-sm font-medium text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-950/20"
            >
              <MessageSquare className="h-4 w-4" />
              Tambah Catatan Satgas
            </button>
          </div>
        )}

      {/* Note forms */}
      {showNoteForm && (
        <NoteForm
          reportId={reportId}
          noteType={showNoteForm}
          onSuccess={() => {
            setShowNoteForm(null);
            onNoteAdded?.();
          }}
          onCancel={() => setShowNoteForm(null)}
        />
      )}

      {/* Resolve form */}
      {showResolveForm && (
        <ResolveForm
          reportId={reportId}
          onSuccess={(newStatus) => {
            setShowResolveForm(false);
            onStatusChange?.(newStatus);
          }}
          onCancel={() => setShowResolveForm(false)}
        />
      )}
    </div>
  );
}
