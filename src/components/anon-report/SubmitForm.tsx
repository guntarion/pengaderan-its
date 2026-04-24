/**
 * src/components/anon-report/SubmitForm.tsx
 * NAWASENA M12 — Anonymous report submission form (client component).
 *
 * Features:
 * - Cohort dropdown (from public API)
 * - Category picker (radio group)
 * - Body textarea (min 20 chars)
 * - Optional severity indicator
 * - Captcha widget
 * - Submit with loading state
 *
 * On success: redirects to /anon-report/success?code=NW-XXXXXXXX
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnonCategory, AnonSeverity } from '@prisma/client';
import { CategoryPicker } from './CategoryPicker';
import { CaptchaWidget, CaptchaWidgetDev } from './CaptchaWidget';
import { AnonymityNotice } from './AnonymityNotice';
import { toast } from '@/lib/toast';
import { Loader2, Send } from 'lucide-react';

interface Cohort {
  id: string;
  label: string;
  organizationId: string;
}

export function SubmitForm() {
  const router = useRouter();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loadingCohorts, setLoadingCohorts] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [cohortId, setCohortId] = useState('');
  const [category, setCategory] = useState<AnonCategory | ''>('');
  const [bodyText, setBodyText] = useState('');
  const [reporterSeverity, setReporterSeverity] = useState<AnonSeverity | ''>('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load cohorts on mount
  useEffect(() => {
    fetch('/api/cohorts/public')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setCohorts(data.data);
        }
      })
      .catch(() => {
        toast.error('Gagal memuat daftar kohort');
      })
      .finally(() => setLoadingCohorts(false));
  }, []);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!cohortId) newErrors.cohortId = 'Pilih kohort Anda';
    if (!category) newErrors.category = 'Pilih kategori laporan';
    if (bodyText.trim().length < 20) {
      newErrors.bodyText = 'Laporan minimal 20 karakter';
    }
    if (!captchaToken) newErrors.captcha = 'Selesaikan verifikasi captcha terlebih dahulu';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setSubmitting(true);

    try {
      const response = await fetch('/api/anon-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cohortId,
          category,
          bodyText: bodyText.trim(),
          ...(reporterSeverity ? { reporterSeverity } : {}),
          captchaToken: captchaToken!,
        }),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/anon-report/success?code=${data.data.trackingCode}`);
      } else {
        const msg = data.error?.message ?? 'Gagal mengirim laporan';
        toast.error(msg);

        // Handle validation errors
        if (data.error?.details) {
          const fieldErrors: Record<string, string> = {};
          for (const detail of data.error.details) {
            fieldErrors[detail.field] = detail.message;
          }
          setErrors(fieldErrors);
        }
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi. Periksa internet Anda dan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const isDev = process.env.NODE_ENV === 'development';
  const charCount = bodyText.trim().length;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Anonymity notice */}
      <AnonymityNotice compact />

      {/* Cohort selector */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
          Kohort Anda <span className="text-red-500">*</span>
        </label>
        {loadingCohorts ? (
          <div className="flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 dark:border-gray-700 dark:bg-gray-800">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            <span className="text-sm text-gray-400">Memuat...</span>
          </div>
        ) : (
          <select
            value={cohortId}
            onChange={(e) => {
              setCohortId(e.target.value);
              setErrors((prev) => ({ ...prev, cohortId: '' }));
            }}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            <option value="">-- Pilih kohort Anda --</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        )}
        {errors.cohortId && (
          <p className="mt-1 text-xs text-red-500">{errors.cohortId}</p>
        )}
      </div>

      {/* Category */}
      <CategoryPicker
        value={category}
        onChange={(v) => {
          setCategory(v);
          setErrors((prev) => ({ ...prev, category: '' }));
        }}
        error={errors.category}
      />

      {/* Body text */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
          Ceritakan situasi yang Anda alami <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <textarea
            value={bodyText}
            onChange={(e) => {
              setBodyText(e.target.value);
              if (e.target.value.trim().length >= 20) {
                setErrors((prev) => ({ ...prev, bodyText: '' }));
              }
            }}
            rows={6}
            maxLength={5000}
            placeholder="Jelaskan apa yang terjadi, kapan, dan di mana. Semakin detail, semakin mudah petugas menindaklanjuti laporan Anda. Identitas Anda tetap aman."
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          />
          <p
            className={`mt-1 text-right text-xs ${
              charCount < 20
                ? 'text-red-500'
                : charCount > 4500
                ? 'text-amber-500'
                : 'text-gray-400'
            }`}
          >
            {charCount}/5000 {charCount < 20 && `(minimal ${20 - charCount} karakter lagi)`}
          </p>
        </div>
        {errors.bodyText && (
          <p className="mt-1 text-xs text-red-500">{errors.bodyText}</p>
        )}
      </div>

      {/* Optional severity */}
      <div>
        <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Menurut Anda, seberapa serius masalah ini? (opsional)
        </p>
        <div className="flex gap-3">
          {[
            { value: AnonSeverity.GREEN, label: 'Ringan', color: 'text-green-600 bg-green-50 border-green-100 dark:bg-green-950/20 dark:border-green-900' },
            { value: AnonSeverity.YELLOW, label: 'Sedang', color: 'text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900' },
            { value: AnonSeverity.RED, label: 'Serius', color: 'text-red-600 bg-red-50 border-red-100 dark:bg-red-950/20 dark:border-red-900' },
          ].map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setReporterSeverity(reporterSeverity === s.value ? '' : s.value)}
              className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${s.color} ${
                reporterSeverity === s.value ? 'ring-1 ring-current' : 'opacity-70'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Captcha */}
      <div>
        {isDev ? (
          <CaptchaWidgetDev onToken={setCaptchaToken} />
        ) : (
          <CaptchaWidget onToken={setCaptchaToken} />
        )}
        {errors.captcha && (
          <p className="mt-1 text-xs text-red-500">{errors.captcha}</p>
        )}
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Mengirim laporan...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Kirim Laporan Anonim
          </>
        )}
      </button>

      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
        Dengan mengirim laporan, Anda menyetujui bahwa informasi ini akan diproses secara anonim
        sesuai kebijakan privasi NAWASENA.
      </p>
    </form>
  );
}
