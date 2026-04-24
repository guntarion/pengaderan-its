/**
 * src/components/kp-mood/FollowUpModal.tsx
 * NAWASENA M04 — Modal to record follow-up action for a red-flag event.
 */

'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/lib/toast';

interface FollowUpModalProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

const CONTACT_TYPE_OPTIONS = [
  { value: 'CHAT', label: 'Chat (WA / DM)' },
  { value: 'CALL', label: 'Telepon / Video Call' },
  { value: 'IN_PERSON', label: 'Tatap Muka' },
  { value: 'OTHER', label: 'Lainnya' },
] as const;

const MIN_SUMMARY = 20;

export function FollowUpModal({ eventId, isOpen, onClose, onSubmitted }: FollowUpModalProps) {
  const [contactType, setContactType] = useState<string>('CHAT');
  const [summary, setSummary] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const summaryTooShort = summary.length < MIN_SUMMARY;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (summaryTooShort) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/kp/red-flag/${eventId}/follow-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cohortId: '', // cohortId resolved server-side from event
          contactType,
          summary,
          nextAction: nextAction || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error?.message ?? 'Gagal menyimpan tindak lanjut');
        return;
      }

      toast.success('Tindak lanjut berhasil dicatat');
      setSummary('');
      setNextAction('');
      setContactType('CHAT');
      onSubmitted?.();
      onClose();
    } catch {
      toast.error('Gagal terhubung ke server');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-gray-800 dark:text-gray-100">
            Catat Tindak Lanjut
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Contact type */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Jenis Kontak
            </label>
            <select
              value={contactType}
              onChange={(e) => setContactType(e.target.value)}
              className="w-full px-4 py-2.5 border border-sky-200 dark:border-sky-800 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white dark:bg-slate-700 text-sm text-gray-700 dark:text-gray-200"
            >
              {CONTACT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Summary */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Ringkasan <span className="text-red-500">*</span>
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={4}
              placeholder="Ceritakan bagaimana kondisi anggota dan apa yang dibahas..."
              className="w-full px-4 py-2.5 border border-sky-200 dark:border-sky-800 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white dark:bg-slate-700 text-sm resize-none"
            />
            <div className="flex justify-between text-xs">
              {summaryTooShort ? (
                <span className="text-amber-500">
                  Minimal {MIN_SUMMARY} karakter ({summary.length}/{MIN_SUMMARY})
                </span>
              ) : (
                <span className="text-emerald-500">OK</span>
              )}
              <span className="text-gray-400">{summary.length} karakter</span>
            </div>
          </div>

          {/* Next action (optional) */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Rencana Tindak Lanjut{' '}
              <span className="text-xs text-gray-400">(opsional)</span>
            </label>
            <textarea
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              rows={2}
              placeholder="Langkah berikutnya jika ada..."
              className="w-full px-4 py-2.5 border border-sky-200 dark:border-sky-800 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white dark:bg-slate-700 text-sm resize-none"
            />
          </div>

          <DialogFooter className="pt-2 gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="border border-sky-300 text-sky-600 hover:bg-sky-50 rounded-xl font-medium py-2.5 px-4 text-sm transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={summaryTooShort || isSubmitting}
              className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-medium py-2.5 px-5 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
