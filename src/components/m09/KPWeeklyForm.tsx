'use client';

/**
 * src/components/m09/KPWeeklyForm.tsx
 * NAWASENA M09 — KP Weekly Debrief form.
 *
 * 3 text areas (min 50 chars each): whatWorked, whatDidnt, changesNeeded.
 * Auto-saves draft to localStorage every 30s.
 * Confirm modal before submit (visible ke peer KP).
 */

import { useState, useEffect, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { Loader2, CheckCircle, Save, Eye } from 'lucide-react';

const log = createLogger('kp-weekly-form');

const DRAFT_KEY = (weekNumber: number, yearNumber: number) =>
  `m09:kp-weekly-draft:${yearNumber}:${weekNumber}`;

interface KPWeeklyFormProps {
  weekNumber: number;
  yearNumber: number;
  prefill?: {
    whatWorked?: string;
    whatDidnt?: string;
    changesNeeded?: string;
  } | null;
  onSuccess?: () => void;
}

interface FieldConfig {
  key: 'whatWorked' | 'whatDidnt' | 'changesNeeded';
  label: string;
  placeholder: string;
  minChars: number;
}

const FIELDS: FieldConfig[] = [
  {
    key: 'whatWorked',
    label: 'Apa yang Berjalan Baik?',
    placeholder:
      'Ceritakan hal-hal positif yang berhasil minggu ini. Apa yang sudah berjalan sesuai rencana? Momen apa yang membuat kamu dan kelompok merasa berhasil?',
    minChars: 50,
  },
  {
    key: 'whatDidnt',
    label: 'Apa yang Tidak Berjalan?',
    placeholder:
      'Jujurkan tantangan yang dihadapi minggu ini. Kendala apa yang muncul? Hal apa yang tidak sesuai ekspektasi?',
    minChars: 50,
  },
  {
    key: 'changesNeeded',
    label: 'Apa yang Perlu Diubah?',
    placeholder:
      'Rencana perbaikan untuk minggu depan. Apa yang akan kamu lakukan berbeda? Langkah konkret apa yang akan diambil?',
    minChars: 50,
  },
];

export function KPWeeklyForm({
  weekNumber,
  yearNumber,
  prefill,
  onSuccess,
}: KPWeeklyFormProps) {
  const [values, setValues] = useState({
    whatWorked: prefill?.whatWorked ?? '',
    whatDidnt: prefill?.whatDidnt ?? '',
    changesNeeded: prefill?.changesNeeded ?? '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const draftKey = DRAFT_KEY(weekNumber, yearNumber);

  // Load draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const draft = JSON.parse(saved);
        // Only use draft if no prefill provided
        if (!prefill?.whatWorked && draft.whatWorked) {
          setValues(draft);
          setLastSaved(new Date(draft._savedAt));
        }
      }
    } catch {
      // ignore parse errors
    }
  }, [draftKey, prefill]);

  // Auto-save draft every 30s
  useEffect(() => {
    autoSaveRef.current = setInterval(() => {
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({ ...values, _savedAt: new Date().toISOString() }),
        );
        setLastSaved(new Date());
        log.debug('KP weekly draft auto-saved', { weekNumber, yearNumber });
      } catch {
        // ignore storage errors
      }
    }, 30000);
    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [draftKey, values, weekNumber, yearNumber]);

  const handleChange = (key: keyof typeof values, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const canSubmit = FIELDS.every(
    (f) => values[f.key].trim().length >= f.minChars,
  );

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setConfirmOpen(false);

    try {
      log.info('Submitting KP weekly debrief', { weekNumber, yearNumber });

      const res = await fetch('/api/kp/log/weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekNumber, yearNumber, ...values }),
      });

      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }

      // Clear draft
      try {
        localStorage.removeItem(draftKey);
      } catch {
        // ignore
      }

      toast.success('Debrief mingguan berhasil dikirim');
      onSuccess?.();
    } catch (err) {
      log.error('Failed to submit KP weekly debrief', { err });
      toast.error('Gagal mengirim debrief mingguan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Auto-save indicator */}
      {lastSaved && (
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Save className="h-3.5 w-3.5" />
          Draft tersimpan {lastSaved.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}

      {/* Form fields */}
      {FIELDS.map((field) => {
        const charCount = values[field.key].trim().length;
        const isValid = charCount >= field.minChars;
        return (
          <div key={field.key} className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {field.label}
            </Label>
            <Textarea
              value={values[field.key]}
              onChange={(e) => handleChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              rows={5}
              maxLength={2000}
              disabled={isSubmitting}
              className={`resize-none rounded-xl text-sm transition-colors ${
                charCount > 0 && !isValid
                  ? 'border-amber-300 dark:border-amber-700 focus:ring-amber-400'
                  : 'border-sky-200 dark:border-sky-800 focus:ring-sky-500'
              }`}
            />
            <div className="flex justify-between text-xs">
              <span
                className={
                  charCount > 0 && !isValid
                    ? 'text-amber-500'
                    : isValid
                    ? 'text-emerald-500'
                    : 'text-gray-400'
                }
              >
                {isValid ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Minimal {field.minChars} karakter
                  </span>
                ) : (
                  `Minimal ${field.minChars} karakter (${charCount} saat ini)`
                )}
              </span>
              <span className="text-gray-400">{charCount}/2000</span>
            </div>
          </div>
        );
      })}

      {/* Visibility notice */}
      <div className="p-3 bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-xl flex items-start gap-2">
        <Eye className="h-4 w-4 text-sky-500 shrink-0 mt-0.5" />
        <p className="text-xs text-sky-700 dark:text-sky-400">
          <span className="font-semibold">Catatan:</span> Debrief mingguan ini dapat dibaca oleh
          sesama KP dalam satu cohort sebagai bahan refleksi bersama.
        </p>
      </div>

      {/* Submit button */}
      <Button
        onClick={() => setConfirmOpen(true)}
        disabled={!canSubmit || isSubmitting}
        className="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl py-3 font-medium hover:from-sky-600 hover:to-blue-700 transition-all disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Mengirim...
          </>
        ) : (
          <>
            <CheckCircle className="h-4 w-4 mr-2" />
            Kirim Debrief Mingguan
          </>
        )}
      </Button>

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Kirim Debrief</DialogTitle>
            <DialogDescription>
              Debrief minggu ke-{weekNumber} ini akan dikirim dan dapat dibaca oleh sesama KP dalam
              cohortmu. Setelah dikirim, tidak dapat diubah.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isSubmitting}>
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Mengirim...
                </>
              ) : (
                'Ya, Kirim'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
