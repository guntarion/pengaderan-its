'use client';

/**
 * src/components/mental-health/SACFollowUpForm.tsx
 * NAWASENA M11 — SAC follow-up form: add encrypted note + optional status transition.
 *
 * Props: referralId, currentStatus
 * POSTs to /api/mental-health/referrals/[id]/note
 * On success: toast + router.back()
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/lib/toast';

interface SACFollowUpFormProps {
  referralId: string;
  currentStatus: string;
}

const MAX_NOTE_LENGTH = 2000;

const VALID_TRANSITIONS: Record<string, { value: string; label: string }[]> = {
  PENDING: [{ value: 'IN_PROGRESS', label: 'Tandai Sedang Diproses' }],
  IN_PROGRESS: [{ value: 'RESOLVED', label: 'Tandai Selesai' }],
};

export function SACFollowUpForm({ referralId, currentStatus }: SACFollowUpFormProps) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [statusTransition, setStatusTransition] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const transitions = VALID_TRANSITIONS[currentStatus] ?? [];
  const remaining = MAX_NOTE_LENGTH - note.length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!note.trim()) {
      toast.apiError({ message: 'Catatan tidak boleh kosong' });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: { note: string; statusTransition?: string } = { note: note.trim() };
      if (statusTransition) payload.statusTransition = statusTransition;

      const res = await fetch(`/api/mental-health/referrals/${referralId}/note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw err;
      }

      toast.success('Catatan berhasil disimpan.');
      router.back();
    } catch (err) {
      toast.apiError(err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="note" className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Catatan Konseling
        </Label>
        <Textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, MAX_NOTE_LENGTH))}
          placeholder="Tuliskan catatan konseling di sini. Catatan ini akan dienkripsi dan hanya dapat diakses oleh SAC yang ditugaskan."
          rows={8}
          className="rounded-xl resize-none"
          required
        />
        <p className={`text-xs text-right ${remaining < 100 ? 'text-orange-500' : 'text-gray-400'}`}>
          {remaining} karakter tersisa
        </p>
      </div>

      {transitions.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="status" className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Update Status (Opsional)
          </Label>
          <Select value={statusTransition} onValueChange={setStatusTransition}>
            <SelectTrigger id="status" className="rounded-xl">
              <SelectValue placeholder="— Tidak mengubah status —" />
            </SelectTrigger>
            <SelectContent>
              {transitions.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Status saat ini: <strong>{currentStatus}</strong>
          </p>
        </div>
      )}

      <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Catatan ini akan dienkripsi sebelum disimpan. Menyimpan catatan akan tercatat dalam audit log keamanan.
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={isSubmitting || !note.trim()}
          className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl"
        >
          {isSubmitting ? 'Menyimpan...' : 'Simpan Catatan'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
          className="rounded-xl"
        >
          Batal
        </Button>
      </div>
    </form>
  );
}

export default SACFollowUpForm;
