'use client';

/**
 * src/components/safeguard/IncidentActionBar.tsx
 * NAWASENA M10 — Context-sensitive action buttons for an incident detail page.
 *
 * Buttons shown per role + status:
 *   SC              : Claim (OPEN), Resolve (IN_REVIEW), Reopen (RESOLVED), Add Note, Retract (OPEN/IN_REVIEW)
 *   SG-Officer      : Claim (OPEN), Resolve (IN_REVIEW), Escalate to Satgas (IN_REVIEW), Add Note
 *   PEMBINA         : Add Annotation only (read-only for mutations)
 *   Reporter / KP   : Retract (OPEN or IN_REVIEW + within 30 min window)
 *   Others          : read-only (no buttons rendered)
 */

import { useState } from 'react';
import {
  UserCheck,
  CheckCircle2,
  RotateCcw,
  StickyNote,
  XCircle,
  ArrowUpRight,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { useConfirm } from '@/hooks/useConfirm';
import { createLogger } from '@/lib/logger';

const log = createLogger('incident-action-bar');

// --- Types ---

export interface IncidentActionBarProps {
  incidentId: string;
  status: string;
  reportedById: string;
  claimedById?: string | null;
  createdAt: string; // ISO string
  viewerId: string;
  viewerRole: string;
  viewerIsSafeguardOfficer: boolean;
  onActionComplete?: () => void; // called after successful mutation → triggers parent re-fetch
}

const RETRACTION_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

// --- Modal sub-components ---

interface TextModalProps {
  title: string;
  placeholder: string;
  minLength: number;
  minLengthLabel: string;
  onConfirm: (text: string) => Promise<void>;
  onClose: () => void;
}

function TextModal({ title, placeholder, minLength, minLengthLabel, onConfirm, onClose }: TextModalProps) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isValid = text.trim().length >= minLength;

  async function handleSubmit() {
    if (!isValid) return;
    setSubmitting(true);
    try {
      await onConfirm(text.trim());
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
        <textarea
          className="w-full min-h-[100px] rounded-xl border border-sky-100 dark:border-sky-800 bg-white dark:bg-slate-800 p-3 text-sm text-gray-700 dark:text-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-sky-400"
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
        {!isValid && text.length > 0 && (
          <p className="text-xs text-red-500">{minLengthLabel}</p>
        )}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-xl text-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className="px-4 py-2 rounded-xl text-sm bg-sky-500 text-white font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Escalate Modal (needs reason + escalatedTo + optional satgasTicketRef) ---

interface EscalateModalProps {
  onConfirm: (payload: { escalationReason: string; satgasTicketRef?: string }) => Promise<void>;
  onClose: () => void;
}

function EscalateModal({ onConfirm, onClose }: EscalateModalProps) {
  const [reason, setReason] = useState('');
  const [ticketRef, setTicketRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isValid = reason.trim().length >= 50;

  async function handleSubmit() {
    if (!isValid) return;
    setSubmitting(true);
    try {
      await onConfirm({
        escalationReason: reason.trim(),
        satgasTicketRef: ticketRef.trim() || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ArrowUpRight className="h-5 w-5 text-red-500" />
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Eskalasi ke Satgas</h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Tindakan ini akan mengubah status ke <strong>ESCALATED_TO_SATGAS</strong>. PDF laporan akan digenerate dan dikirim ke Pembina.
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Alasan eskalasi <span className="text-red-400">*</span>
              <span className="ml-1 text-gray-400">(min. 50 karakter)</span>
            </label>
            <textarea
              className="w-full min-h-[100px] rounded-xl border border-sky-100 dark:border-sky-800 bg-white dark:bg-slate-800 p-3 text-sm text-gray-700 dark:text-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="Jelaskan mengapa insiden ini perlu dieskalasi ke Satgas..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-1">{reason.length}/50+ karakter</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Nomor tiket Satgas <span className="text-gray-400">(opsional)</span>
            </label>
            <input
              type="text"
              className="w-full rounded-xl border border-sky-100 dark:border-sky-800 bg-white dark:bg-slate-800 p-2.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="mis. SATGAS-2024-001"
              value={ticketRef}
              onChange={(e) => setTicketRef(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-xl text-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className="px-4 py-2 rounded-xl text-sm bg-red-500 text-white font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Eskalasi
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Main component ---

type ModalType =
  | 'RESOLVE'
  | 'REOPEN'
  | 'NOTE'
  | 'PEMBINA_ANNOTATION'
  | 'RETRACT'
  | 'ESCALATE'
  | null;

export function IncidentActionBar({
  incidentId,
  status,
  reportedById,
  claimedById,
  createdAt,
  viewerId,
  viewerRole,
  viewerIsSafeguardOfficer,
  onActionComplete,
}: IncidentActionBarProps) {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  const isSC = viewerRole === 'SC';
  const isSGOfficer = viewerIsSafeguardOfficer;
  const isPembina = viewerRole === 'PEMBINA';
  const isReporter = viewerId === reportedById;
  const isScOrSg = isSC || isSGOfficer;

  const incidentAge = Date.now() - new Date(createdAt).getTime();
  const isWithinRetractionWindow = incidentAge < RETRACTION_WINDOW_MS;

  // --- Action API calls ---

  async function callApi(path: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/safeguard/incidents/${incidentId}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
    }
    return res.json();
  }

  async function handleClaim() {
    const ok = await confirm(
      'Claim insiden ini?',
      'Status akan berubah ke IN_REVIEW dan Anda menjadi penanggung jawab.',
    );
    if (!ok) return;
    setLoadingAction('CLAIM');
    try {
      await callApi('claim', {});
      toast.success('Insiden berhasil di-claim');
      log.info('Incident claimed', { incidentId });
      onActionComplete?.();
    } catch (err) {
      toast.apiError(err);
      log.error('Claim failed', { incidentId, error: err });
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleResolve(note: string) {
    setLoadingAction('RESOLVE');
    try {
      await callApi('resolve', { resolutionNote: note });
      toast.success('Insiden berhasil diselesaikan');
      log.info('Incident resolved', { incidentId });
      setActiveModal(null);
      onActionComplete?.();
    } catch (err) {
      toast.apiError(err);
      log.error('Resolve failed', { incidentId, error: err });
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleReopen(reason: string) {
    setLoadingAction('REOPEN');
    try {
      await callApi('reopen', { reason });
      toast.success('Insiden dibuka kembali');
      log.info('Incident reopened', { incidentId });
      setActiveModal(null);
      onActionComplete?.();
    } catch (err) {
      toast.apiError(err);
      log.error('Reopen failed', { incidentId, error: err });
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleAddNote(noteText: string) {
    setLoadingAction('NOTE');
    try {
      await callApi('notes', { noteText });
      toast.success('Catatan ditambahkan');
      log.info('Note added', { incidentId });
      setActiveModal(null);
      onActionComplete?.();
    } catch (err) {
      toast.apiError(err);
      log.error('Add note failed', { incidentId, error: err });
    } finally {
      setLoadingAction(null);
    }
  }

  async function handlePembinaAnnotation(noteText: string) {
    setLoadingAction('PEMBINA_ANNOTATION');
    try {
      await callApi('pembina-annotation', { noteText });
      toast.success('Anotasi ditambahkan');
      log.info('Pembina annotation added', { incidentId });
      setActiveModal(null);
      onActionComplete?.();
    } catch (err) {
      toast.apiError(err);
      log.error('Pembina annotation failed', { incidentId, error: err });
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleRetract(reason: string) {
    setLoadingAction('RETRACT');
    try {
      await callApi('retract', { reason });
      toast.success('Insiden berhasil di-retract');
      log.info('Incident retracted', { incidentId });
      setActiveModal(null);
      onActionComplete?.();
    } catch (err) {
      toast.apiError(err);
      log.error('Retract failed', { incidentId, error: err });
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleEscalate(payload: { escalationReason: string; satgasTicketRef?: string }) {
    setLoadingAction('ESCALATE');
    try {
      await callApi('escalate', {
        escalationReason: payload.escalationReason,
        escalatedTo: 'SATGAS_PPKPT_ITS',
        satgasTicketRef: payload.satgasTicketRef,
      });
      toast.success('Insiden dieskalasi ke Satgas');
      log.info('Incident escalated', { incidentId });
      setActiveModal(null);
      onActionComplete?.();
    } catch (err) {
      toast.apiError(err);
      log.error('Escalate failed', { incidentId, error: err });
    } finally {
      setLoadingAction(null);
    }
  }

  // --- Render: Pembina (annotation only) ---

  if (isPembina) {
    return (
      <>
        <button
          onClick={() => setActiveModal('PEMBINA_ANNOTATION')}
          disabled={!!loadingAction}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-violet-500 text-white font-medium hover:bg-violet-600 disabled:opacity-50 transition-colors"
        >
          {loadingAction === 'PEMBINA_ANNOTATION' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MessageSquare className="h-4 w-4" />
          )}
          Tambah Anotasi
        </button>

        {activeModal === 'PEMBINA_ANNOTATION' && (
          <TextModal
            title="Anotasi Pembina"
            placeholder="Tambahkan anotasi atau catatan Anda sebagai Pembina..."
            minLength={10}
            minLengthLabel="Anotasi minimal 10 karakter"
            onConfirm={handlePembinaAnnotation}
            onClose={() => setActiveModal(null)}
          />
        )}

        <ConfirmDialog />
      </>
    );
  }

  // --- Render: SC or SG-Officer ---

  if (isScOrSg) {
    const canClaim = status === 'OPEN';
    const canResolve = status === 'IN_REVIEW';
    const canReopen = isSC && status === 'RESOLVED';
    const canNote = ['OPEN', 'IN_REVIEW', 'PENDING_REVIEW'].includes(status);
    const canRetract =
      isSC &&
      ['OPEN', 'IN_REVIEW'].includes(status);
    const canEscalate =
      isSGOfficer && status === 'IN_REVIEW';

    if (!canClaim && !canResolve && !canReopen && !canNote && !canRetract && !canEscalate) {
      return null;
    }

    return (
      <>
        <div className="flex flex-wrap gap-2">
          {canClaim && (
            <button
              onClick={handleClaim}
              disabled={!!loadingAction}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-sky-500 text-white font-medium hover:bg-sky-600 disabled:opacity-50 transition-colors"
            >
              {loadingAction === 'CLAIM' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserCheck className="h-4 w-4" />
              )}
              Claim
            </button>
          )}

          {canResolve && (
            <button
              onClick={() => setActiveModal('RESOLVE')}
              disabled={!!loadingAction}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-emerald-500 text-white font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors"
            >
              <CheckCircle2 className="h-4 w-4" />
              Selesaikan
            </button>
          )}

          {canReopen && (
            <button
              onClick={() => setActiveModal('REOPEN')}
              disabled={!!loadingAction}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Buka Kembali
            </button>
          )}

          {canEscalate && (
            <button
              onClick={() => setActiveModal('ESCALATE')}
              disabled={!!loadingAction}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-red-500 text-white font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              <ArrowUpRight className="h-4 w-4" />
              Eskalasi Satgas
            </button>
          )}

          {canNote && (
            <button
              onClick={() => setActiveModal('NOTE')}
              disabled={!!loadingAction}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm border border-sky-200 dark:border-sky-700 text-sky-700 dark:text-sky-300 bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-900/20 disabled:opacity-50 transition-colors"
            >
              <StickyNote className="h-4 w-4" />
              Tambah Catatan
            </button>
          )}

          {canRetract && (
            <button
              onClick={() => setActiveModal('RETRACT')}
              disabled={!!loadingAction}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
            >
              <XCircle className="h-4 w-4" />
              Retract (SC)
            </button>
          )}
        </div>

        {activeModal === 'RESOLVE' && (
          <TextModal
            title="Selesaikan Insiden"
            placeholder="Jelaskan resolusi insiden ini..."
            minLength={30}
            minLengthLabel="Catatan resolusi minimal 30 karakter"
            onConfirm={handleResolve}
            onClose={() => setActiveModal(null)}
          />
        )}

        {activeModal === 'REOPEN' && (
          <TextModal
            title="Buka Kembali Insiden"
            placeholder="Mengapa insiden ini perlu dibuka kembali?"
            minLength={10}
            minLengthLabel="Alasan minimal 10 karakter"
            onConfirm={handleReopen}
            onClose={() => setActiveModal(null)}
          />
        )}

        {activeModal === 'NOTE' && (
          <TextModal
            title="Tambah Catatan"
            placeholder="Tulis catatan internal untuk insiden ini..."
            minLength={5}
            minLengthLabel="Catatan minimal 5 karakter"
            onConfirm={handleAddNote}
            onClose={() => setActiveModal(null)}
          />
        )}

        {activeModal === 'RETRACT' && (
          <TextModal
            title="Retract Insiden (SC)"
            placeholder="Alasan retraksi oleh SC..."
            minLength={10}
            minLengthLabel="Alasan minimal 10 karakter"
            onConfirm={handleRetract}
            onClose={() => setActiveModal(null)}
          />
        )}

        {activeModal === 'ESCALATE' && (
          <EscalateModal
            onConfirm={handleEscalate}
            onClose={() => setActiveModal(null)}
          />
        )}

        <ConfirmDialog />
      </>
    );
  }

  // --- Render: Reporter / KP (retract only if within window) ---

  if (isReporter && isWithinRetractionWindow && ['OPEN', 'IN_REVIEW'].includes(status)) {
    const minutesLeft = Math.floor(
      (RETRACTION_WINDOW_MS - incidentAge) / 60000,
    );

    return (
      <>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveModal('RETRACT')}
            disabled={!!loadingAction}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
          >
            <XCircle className="h-4 w-4" />
            Tarik Laporan
          </button>
          <span className="text-xs text-gray-400">
            Sisa {minutesLeft} menit untuk menarik laporan
          </span>
        </div>

        {activeModal === 'RETRACT' && (
          <TextModal
            title="Tarik Laporan"
            placeholder="Mengapa Anda ingin menarik laporan ini?"
            minLength={5}
            minLengthLabel="Alasan minimal 5 karakter"
            onConfirm={handleRetract}
            onClose={() => setActiveModal(null)}
          />
        )}

        <ConfirmDialog />
      </>
    );
  }

  // --- All others: read-only ---
  return null;
}
