'use client';

/**
 * src/app/(DashboardLayout)/dashboard/sc/triwulan/new/page.tsx
 * NAWASENA M14 — SC: Generate a new triwulan review.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { FileText, Sparkles, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const log = createLogger('m14/sc/triwulan/new');

interface CohortOption {
  id: string;
  code: string;
  name: string;
}

const QUARTER_OPTIONS = [
  { value: 1, label: 'Triwulan I (Jan–Mar)' },
  { value: 2, label: 'Triwulan II (Apr–Jun)' },
  { value: 3, label: 'Triwulan III (Jul–Sep)' },
  { value: 4, label: 'Triwulan IV (Okt–Des)' },
];

export default function SCNewTriwulanPage() {
  const router = useRouter();
  const [cohorts, setCohorts] = useState<CohortOption[]>([]);
  const [selectedCohort, setSelectedCohort] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState<number>(1);
  const [generating, setGenerating] = useState(false);
  const [loadingCohorts, setLoadingCohorts] = useState(true);

  useEffect(() => {
    async function fetchCohorts() {
      setLoadingCohorts(true);
      try {
        const res = await fetch('/api/cohorts?active=true');
        if (!res.ok) return;
        const data = await res.json();
        const list: CohortOption[] = data.data ?? [];
        setCohorts(list);
        if (list.length === 1) setSelectedCohort(list[0].id);
      } catch (err) {
        log.error('Failed to fetch cohorts', { error: err });
      } finally {
        setLoadingCohorts(false);
      }
    }
    fetchCohorts();
  }, []);

  const handleGenerate = async () => {
    if (!selectedCohort) {
      toast.error('Pilih angkatan terlebih dahulu');
      return;
    }
    setGenerating(true);
    try {
      log.info('Generating triwulan review', { cohortId: selectedCohort, quarterNumber: selectedQuarter });
      const res = await fetch('/api/triwulan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cohortId: selectedCohort, quarterNumber: selectedQuarter }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.apiError(data);
        return;
      }

      const { reviewId, isExisting, escalationLevel } = data.data;

      if (isExisting) {
        toast.success('Review sudah ada — membuka review yang ada');
      } else {
        if (escalationLevel && escalationLevel !== 'NONE') {
          toast.warning(`Review dibuat dengan eskalasi ${escalationLevel}`);
        } else {
          toast.success('Review berhasil dibuat');
        }
      }

      router.push(`/dashboard/sc/triwulan/${reviewId}`);
    } catch (err) {
      toast.apiError(err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-6 px-4">
        <div className="container mx-auto max-w-3xl">
          <DynamicBreadcrumb
            homeLabel="Dashboard"
            homeHref="/dashboard"
            className="text-white/70 mb-3 text-sm"
          />
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6" />
            <div>
              <h1 className="text-xl font-bold">Buat Review Triwulan</h1>
              <p className="text-sm text-white/70">
                Sistem akan mengambil data otomatis dari semua modul
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-6 space-y-6">
          {/* Info */}
          <div className="flex items-start gap-3 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-xl p-4">
            <FileText className="h-5 w-5 text-sky-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-sky-700 dark:text-sky-300">
                Proses Pengumpulan Data Otomatis
              </p>
              <p className="text-xs text-sky-600 dark:text-sky-400 mt-1">
                Sistem akan secara otomatis mengambil data KPI, Kirkpatrick, insiden, laporan
                anonim, kepatuhan, dan lainnya. Proses ini membutuhkan beberapa detik.
              </p>
            </div>
          </div>

          {/* Cohort selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Angkatan
            </label>
            {loadingCohorts ? (
              <div className="h-10 bg-gray-100 dark:bg-slate-700 rounded-xl animate-pulse" />
            ) : (
              <select
                value={selectedCohort}
                onChange={(e) => setSelectedCohort(e.target.value)}
                disabled={generating}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-sky-200 dark:border-sky-800 bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-300"
              >
                <option value="">Pilih angkatan...</option>
                {cohorts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Quarter selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Triwulan
            </label>
            <div className="grid grid-cols-2 gap-2">
              {QUARTER_OPTIONS.map((q) => (
                <button
                  key={q.value}
                  type="button"
                  disabled={generating}
                  onClick={() => setSelectedQuarter(q.value)}
                  className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                    selectedQuarter === q.value
                      ? 'bg-sky-500 border-sky-500 text-white'
                      : 'bg-white dark:bg-slate-700 border-sky-200 dark:border-sky-800 text-gray-700 dark:text-gray-300 hover:border-sky-400'
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Warning about mid-quarter */}
          <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Membuat review di tengah triwulan akan menghasilkan snapshot data tidak lengkap.
              Direkomendasikan membuat review setelah triwulan berakhir.
            </p>
          </div>

          {/* Submit */}
          <Button
            onClick={handleGenerate}
            disabled={!selectedCohort || generating}
            className="w-full rounded-xl bg-sky-500 hover:bg-sky-600 text-white"
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Mengumpulkan data...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Buat Review Otomatis
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
