'use client';

/**
 * src/components/event-execution/EvaluationForm.tsx
 * NAWASENA M08 — Post-event evaluation form.
 *
 * - Pre-fill cards with source attribution
 * - Override toggle per field + reason input
 * - Disclaimer banner (n<5, M10 not integrated)
 * - Read-only view if already submitted
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { submitEvaluationSchema, type SubmitEvaluationInput } from '@/lib/event-execution/schemas';
import { toast } from '@/lib/toast';
import {
  Loader2,
  InfoIcon,
  CheckCircle2Icon,
  ToggleLeftIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface EvaluationPrefill {
  instanceId: string;
  instanceStatus: string;
  kegiatanNama: string;
  attendancePct: number | null;
  confirmedCount: number;
  hadirCount: number;
  npsScore: number | null;
  npsResponseCount: number;
  redFlagsCount: number | null;
  redFlagsSource: string;
  existingEvaluation: {
    id: string;
    attendancePct: number | null;
    attendancePctOverride: number | null;
    npsScore: number | null;
    npsScoreOverride: number | null;
    scoreL2agg: number | null;
    notes: string | null;
    filledAt: string;
    submittedLate: boolean;
  } | null;
}

interface EvaluationFormProps {
  instanceId: string;
  prefill: EvaluationPrefill;
}

export function EvaluationForm({ instanceId, prefill }: EvaluationFormProps) {
  const router = useRouter();
  const [overrideAttendance, setOverrideAttendance] = useState(false);
  const [overrideNps, setOverrideNps] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SubmitEvaluationInput>({
    resolver: zodResolver(submitEvaluationSchema),
    defaultValues: {
      scoreL2agg: undefined,
    },
  });

  const onSubmit = async (data: SubmitEvaluationInput) => {
    const payload: SubmitEvaluationInput = {
      ...data,
      attendancePctOverride: overrideAttendance ? data.attendancePctOverride : null,
      attendancePctOverrideReason: overrideAttendance ? data.attendancePctOverrideReason : null,
      npsScoreOverride: overrideNps ? data.npsScoreOverride : null,
      npsScoreOverrideReason: overrideNps ? data.npsScoreOverrideReason : null,
    };

    try {
      const res = await fetch(`/api/event-execution/instances/${instanceId}/evaluation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.apiError(json);
        return;
      }
      toast.success('Evaluasi berhasil disubmit!');
      if (json.data?.submittedLate) {
        toast.error('Evaluasi diserahkan terlambat (>14 hari setelah DONE).');
      }
      router.refresh();
    } catch (err) {
      toast.apiError(err);
    }
  };

  // Read-only view if already submitted
  if (prefill.existingEvaluation) {
    const ev = prefill.existingEvaluation;
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
          <CheckCircle2Icon className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800 dark:text-green-300">
              Evaluasi sudah disubmit
            </p>
            {ev.submittedLate && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Terlambat</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Kehadiran</p>
            <p className="font-bold text-gray-800 dark:text-gray-200">
              {ev.attendancePctOverride !== null
                ? `${(ev.attendancePctOverride * 100).toFixed(1)}% (override)`
                : ev.attendancePct !== null
                ? `${(ev.attendancePct * 100).toFixed(1)}%`
                : '-'}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">NPS Score</p>
            <p className="font-bold text-gray-800 dark:text-gray-200">
              {ev.npsScoreOverride !== null
                ? `${ev.npsScoreOverride.toFixed(1)} (override)`
                : ev.npsScore !== null
                ? ev.npsScore.toFixed(1)
                : 'N/A'}
            </p>
          </div>
          {ev.scoreL2agg !== null && (
            <div className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Skor L2 (Kirkpatrick)</p>
              <p className="font-bold text-gray-800 dark:text-gray-200">{ev.scoreL2agg}/100</p>
            </div>
          )}
        </div>

        {ev.notes && (
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Catatan</p>
            <div className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {ev.notes}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Form view
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Disclaimer */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 text-xs text-blue-700 dark:text-blue-400 space-y-1">
        <div className="flex items-center gap-1.5 font-medium">
          <InfoIcon className="h-3.5 w-3.5" />
          Catatan Evaluasi
        </div>
        {prefill.npsResponseCount < 5 && (
          <p>NPS Score tidak tersedia (respon &lt; 5). Isi manual atau kosongkan.</p>
        )}
        <p>Fitur M10 (analitik lanjutan) belum terintegrasi — Red Flags tidak tersedia.</p>
      </div>

      {/* Attendance prefill */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Kehadiran ({prefill.hadirCount}/{prefill.confirmedCount} hadir)
          </Label>
          <button
            type="button"
            onClick={() => setOverrideAttendance((v) => !v)}
            className="flex items-center gap-1 text-xs text-sky-600 dark:text-sky-400 hover:underline"
          >
            <ToggleLeftIcon className="h-3.5 w-3.5" />
            {overrideAttendance ? 'Pakai computed' : 'Override manual'}
          </button>
        </div>

        {!overrideAttendance ? (
          <div className="bg-sky-50 dark:bg-sky-950/20 rounded-xl border border-sky-100 dark:border-sky-900 px-4 py-2.5 text-sm">
            <span className="font-semibold text-sky-700 dark:text-sky-300">
              {prefill.attendancePct !== null
                ? `${(prefill.attendancePct * 100).toFixed(1)}%`
                : '-'}
            </span>
            <span className="text-xs text-sky-500 dark:text-sky-400 ml-2">(computed dari database)</span>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.01"
                min="0"
                max="1"
                placeholder="0.00 – 1.00"
                {...register('attendancePctOverride', { valueAsNumber: true })}
                className="rounded-xl border-gray-200 dark:border-gray-700"
              />
            </div>
            {errors.attendancePctOverride && (
              <p className="text-xs text-red-500">{errors.attendancePctOverride.message}</p>
            )}
            <Input
              placeholder="Alasan override kehadiran"
              {...register('attendancePctOverrideReason')}
              className="rounded-xl border-gray-200 dark:border-gray-700"
            />
            {errors.attendancePctOverrideReason && (
              <p className="text-xs text-red-500">{errors.attendancePctOverrideReason.message}</p>
            )}
          </div>
        )}
      </div>

      {/* NPS prefill */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            NPS Score ({prefill.npsResponseCount} respon)
          </Label>
          <button
            type="button"
            onClick={() => setOverrideNps((v) => !v)}
            className="flex items-center gap-1 text-xs text-sky-600 dark:text-sky-400 hover:underline"
          >
            <ToggleLeftIcon className="h-3.5 w-3.5" />
            {overrideNps ? 'Pakai computed' : 'Override manual'}
          </button>
        </div>

        {!overrideNps ? (
          <div className="bg-sky-50 dark:bg-sky-950/20 rounded-xl border border-sky-100 dark:border-sky-900 px-4 py-2.5 text-sm">
            {prefill.npsScore !== null ? (
              <>
                <span className="font-semibold text-sky-700 dark:text-sky-300">
                  {prefill.npsScore.toFixed(2)}
                </span>
                <span className="text-xs text-sky-500 dark:text-sky-400 ml-2">(computed dari NPS responses)</span>
              </>
            ) : (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                N/A — {prefill.npsResponseCount < 5 ? 'Respon < 5' : 'Belum ada respon'}
              </span>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Input
              type="number"
              step="0.1"
              min="0"
              max="10"
              placeholder="0.0 – 10.0"
              {...register('npsScoreOverride', { valueAsNumber: true })}
              className="rounded-xl border-gray-200 dark:border-gray-700"
            />
            {errors.npsScoreOverride && (
              <p className="text-xs text-red-500">{errors.npsScoreOverride.message}</p>
            )}
            <Input
              placeholder="Alasan override NPS"
              {...register('npsScoreOverrideReason')}
              className="rounded-xl border-gray-200 dark:border-gray-700"
            />
            {errors.npsScoreOverrideReason && (
              <p className="text-xs text-red-500">{errors.npsScoreOverrideReason.message}</p>
            )}
          </div>
        )}
      </div>

      {/* L2 score */}
      <div>
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
          Skor Kirkpatrick L2 (0–100, opsional)
        </Label>
        <Input
          type="number"
          min="0"
          max="100"
          placeholder="Skor evaluasi belajar peserta"
          {...register('scoreL2agg', { setValueAs: (v) => (v === '' ? null : Number(v)) })}
          className="rounded-xl border-gray-200 dark:border-gray-700"
        />
        {errors.scoreL2agg && (
          <p className="text-xs text-red-500 mt-1">{errors.scoreL2agg.message}</p>
        )}
      </div>

      {/* Notes */}
      <div>
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
          Catatan Evaluasi (opsional)
        </Label>
        <Textarea
          placeholder="Refleksi, pembelajaran, rekomendasi untuk kegiatan serupa di masa depan..."
          rows={5}
          {...register('notes')}
          className="rounded-xl border-gray-200 dark:border-gray-700 resize-none"
        />
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-sky-500 hover:bg-sky-600 text-white rounded-xl"
      >
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Submit Evaluasi
      </Button>
    </form>
  );
}
