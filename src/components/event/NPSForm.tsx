/**
 * src/components/event/NPSForm.tsx
 * NPS form for Maba after attending a Kegiatan Instance.
 * 3 sliders (NPS 0-10, felt safe 1-5, meaningful 1-5) + optional comment.
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';

interface NPSFormProps {
  instanceId: string;
}

function getNPSCategory(score: number): { label: string; color: string } {
  if (score <= 6) return { label: 'Detractor', color: 'text-red-500' };
  if (score <= 8) return { label: 'Passive', color: 'text-amber-500' };
  return { label: 'Promoter', color: 'text-emerald-500' };
}

function SliderField({
  label,
  description,
  value,
  min,
  max,
  onChange,
  leftLabel,
  rightLabel,
}: {
  label: string;
  description?: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  leftLabel: string;
  rightLabel: string;
}) {
  return (
    <div className="space-y-2">
      <div>
        <label className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</label>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
      </div>
      <div className="space-y-1">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-sky-500"
          aria-label={label}
        />
        <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
          <span>{leftLabel}</span>
          <span className="font-semibold text-sky-600 dark:text-sky-400 text-sm">{value}</span>
          <span>{rightLabel}</span>
        </div>
      </div>
    </div>
  );
}

export function NPSForm({ instanceId }: NPSFormProps) {
  const router = useRouter();
  const [npsScore, setNpsScore] = useState(7);
  const [feltSafe, setFeltSafe] = useState(3);
  const [meaningful, setMeaningful] = useState(3);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const npsCategory = getNPSCategory(npsScore);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/event/nps/${instanceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ npsScore, feltSafe, meaningful, comment: comment || undefined }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.apiError(data);
        return;
      }

      toast.success('Terima kasih atas feedback kamu!');
      router.replace(`/dashboard/kegiatan/${instanceId}`);
    } catch (err) {
      toast.apiError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* NPS Score */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm">
        <SliderField
          label="Seberapa puas kamu dengan kegiatan ini?"
          description="0 = sangat tidak puas, 10 = sangat puas"
          value={npsScore}
          min={0}
          max={10}
          onChange={setNpsScore}
          leftLabel="Tidak puas"
          rightLabel="Sangat puas"
        />
        <p className={`text-xs font-medium mt-2 ${npsCategory.color}`}>
          {npsCategory.label}
        </p>
      </div>

      {/* Felt Safe */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm">
        <SliderField
          label="Seberapa aman kamu merasa selama kegiatan?"
          description="1 = sangat tidak aman, 5 = sangat aman"
          value={feltSafe}
          min={1}
          max={5}
          onChange={setFeltSafe}
          leftLabel="Tidak aman"
          rightLabel="Sangat aman"
        />
      </div>

      {/* Meaningful */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm">
        <SliderField
          label="Seberapa bermakna kegiatan ini bagimu?"
          description="1 = tidak bermakna, 5 = sangat bermakna"
          value={meaningful}
          min={1}
          max={5}
          onChange={setMeaningful}
          leftLabel="Tidak bermakna"
          rightLabel="Sangat bermakna"
        />
      </div>

      {/* Comment */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm">
        <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
          Komentar (opsional)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Ceritakan pengalamanmu..."
          className="w-full px-4 py-2.5 border border-sky-200 dark:border-sky-800 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white dark:bg-slate-700 text-sm resize-none"
          aria-label="Komentar opsional"
        />
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">{comment.length}/500</p>
      </div>

      {/* Disclaimer */}
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl text-xs text-blue-700 dark:text-blue-400">
        Feedback kamu bersifat rahasia dan hanya akan ditampilkan secara agregat (minimal 5 responden)
        kepada panitia. Komentar individual tidak akan diidentifikasi.
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl py-3 font-medium hover:from-sky-600 hover:to-blue-700 transition-all"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        {loading ? 'Mengirim...' : 'Kirim Feedback'}
      </Button>
    </form>
  );
}
