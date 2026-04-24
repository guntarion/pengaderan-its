'use client';

/**
 * src/app/(DashboardLayout)/dashboard/safeguard/consequences/new/page.tsx
 * NAWASENA M10 — SC/SG-Officer assigns a new pedagogical consequence.
 *
 * CRITICAL: EducationalBanner is permanent + non-dismissible.
 * ConsequenceTypePicker only shows 5 non-physical types (Permen 55/2024).
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { EducationalBanner } from '@/components/safeguard/EducationalBanner';
import { ConsequenceTypePicker } from '@/components/safeguard/ConsequenceTypePicker';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { ConsequenceType } from '@prisma/client';
import { ShieldAlert, Loader2, AlertCircle } from 'lucide-react';

const log = createLogger('consequence-new-page');

interface SimpleUser {
  id: string;
  fullName: string;
  displayName?: string | null;
  role: string;
}

interface CohortInfo {
  id: string;
  name: string;
}

export default function NewConsequencePage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [submitting, setSubmitting] = useState(false);
  const [type, setType] = useState<ConsequenceType | ''>('');
  const [targetUserId, setTargetUserId] = useState('');
  const [reasonText, setReasonText] = useState('');
  const [deadline, setDeadline] = useState('');
  const [pointsDeducted, setPointsDeducted] = useState<number | ''>('');
  const [relatedIncidentId, setRelatedIncidentId] = useState('');
  const [typeError, setTypeError] = useState('');

  const [mabas, setMabas] = useState<SimpleUser[]>([]);
  const [cohort, setCohort] = useState<CohortInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const userRole = (session?.user as { role?: string })?.role ?? '';
  const isSafeguardOfficer = (session?.user as { isSafeguardOfficer?: boolean })?.isSafeguardOfficer ?? false;
  const organizationId = (session?.user as { organizationId?: string })?.organizationId ?? '';

  // Types restricted to SC+SG-Officer
  const disabledTypes: ConsequenceType[] =
    userRole !== 'SC' && !isSafeguardOfficer
      ? [ConsequenceType.POIN_PASSPORT_DIKURANGI]
      : [];

  const REQUIRES_DEADLINE: ConsequenceType[] = [
    ConsequenceType.REFLEKSI_500_KATA,
    ConsequenceType.PRESENTASI_ULANG,
    ConsequenceType.TUGAS_PENGABDIAN,
  ];

  const needsDeadline = type && REQUIRES_DEADLINE.includes(type as ConsequenceType);
  const needsPoints = type === ConsequenceType.POIN_PASSPORT_DIKURANGI;

  useEffect(() => {
    async function load() {
      try {
        // Fetch maba list from active cohort
        const res = await fetch('/api/users?role=MABA&limit=200');
        if (res.ok) {
          const json = await res.json();
          setMabas(json.data ?? []);
        }

        // Fetch cohort info (use first active cohort)
        const cohortRes = await fetch('/api/cohorts/active');
        if (cohortRes.ok) {
          const cohortJson = await cohortRes.json();
          setCohort(cohortJson.data ?? null);
        }
      } catch (err) {
        log.warn('Could not load supporting data', { err });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!type) {
      setTypeError('Pilih tipe konsekuensi terlebih dahulu');
      return;
    }
    setTypeError('');

    setSubmitting(true);
    try {
      const body = {
        organizationId,
        cohortId: cohort?.id ?? '',
        targetUserId,
        type,
        reasonText,
        ...(deadline ? { deadline: new Date(deadline).toISOString() } : {}),
        ...(pointsDeducted !== '' ? { pointsDeducted: Number(pointsDeducted) } : {}),
        ...(relatedIncidentId ? { relatedIncidentId } : {}),
      };

      log.info('Submitting consequence', { type, targetUserId });

      const res = await fetch('/api/safeguard/consequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.apiError(json);
        return;
      }

      toast.success('Konsekuensi berhasil di-assign');
      router.push('/dashboard/safeguard/consequences');
    } catch (err) {
      log.error('Failed to submit consequence', { err });
      toast.error('Terjadi kesalahan. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <DynamicBreadcrumb />
          <div className="flex items-center gap-3 mt-3">
            <ShieldAlert className="h-6 w-6" />
            <h1 className="text-xl font-bold">Assign Konsekuensi Pedagogis</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl p-6 space-y-6">
        {/* CRITICAL: EducationalBanner — ALWAYS shown, never dismissible */}
        <EducationalBanner />

        {loading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Memuat data...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Consequence type picker */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm">
              <ConsequenceTypePicker
                value={type}
                onChange={setType}
                disabledTypes={disabledTypes}
                error={typeError}
              />
            </div>

            {/* Target user */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Target Maba</h3>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">
                  Pilih Maba <span className="text-red-500">*</span>
                </label>
                <select
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-sky-200 dark:border-sky-800 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white dark:bg-slate-700 text-sm"
                >
                  <option value="">Pilih maba...</option>
                  {mabas.map((maba) => (
                    <option key={maba.id} value={maba.id}>
                      {maba.displayName ?? maba.fullName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reason */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">
                  Alasan Konsekuensi <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-400 ml-1">(min 30 karakter)</span>
                </label>
                <textarea
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  required
                  minLength={30}
                  rows={3}
                  placeholder="Jelaskan latar belakang pemberian konsekuensi ini secara objektif..."
                  className="w-full px-4 py-2.5 border border-sky-200 dark:border-sky-800 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white dark:bg-slate-700 text-sm resize-none"
                />
                {reasonText.length > 0 && reasonText.length < 30 && (
                  <p className="text-xs text-amber-500 mt-1">
                    Masih kurang {30 - reasonText.length} karakter
                  </p>
                )}
              </div>

              {/* Related incident (optional) */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">
                  Terkait Insiden (opsional)
                </label>
                <input
                  type="text"
                  value={relatedIncidentId}
                  onChange={(e) => setRelatedIncidentId(e.target.value)}
                  placeholder="ID Insiden (jika ada)"
                  className="w-full px-4 py-2.5 border border-sky-200 dark:border-sky-800 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white dark:bg-slate-700 text-sm"
                />
              </div>
            </div>

            {/* Conditional fields */}
            {(needsDeadline || needsPoints) && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Detail Tambahan
                </h3>

                {needsDeadline && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">
                      Deadline <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      required
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full px-4 py-2.5 border border-sky-200 dark:border-sky-800 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white dark:bg-slate-700 text-sm"
                    />
                  </div>
                )}

                {needsPoints && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">
                      Jumlah Poin Dikurangi <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={pointsDeducted}
                      onChange={(e) =>
                        setPointsDeducted(e.target.value ? Number(e.target.value) : '')
                      }
                      required
                      min={1}
                      max={100}
                      placeholder="contoh: 10"
                      className="w-full px-4 py-2.5 border border-sky-200 dark:border-sky-800 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white dark:bg-slate-700 text-sm"
                    />
                    {/* Passport impact preview */}
                    {pointsDeducted !== '' && pointsDeducted > 0 && (
                      <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          <strong>Preview dampak:</strong> {pointsDeducted} poin Passport Digital
                          akan dikurangi. Tindakan ini bersifat permanen dan tercatat di sistem.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Info: no physical punishment */}
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-700 dark:text-red-300">
                Dengan menekan tombol submit, Anda menyatakan bahwa konsekuensi yang di-assign
                telah sesuai ketentuan Permendikbudristek No. 55/2024 dan bukan merupakan bentuk
                kekerasan fisik, verbal, atau psikologis.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={submitting}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={submitting || !type || !targetUserId || reasonText.length < 30}
                className="bg-sky-500 hover:bg-sky-600 text-white"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {submitting ? 'Menyimpan...' : 'Assign Konsekuensi'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
