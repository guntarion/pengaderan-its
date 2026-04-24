'use client';

/**
 * /admin/struktur/kasuh-pairing/suggest
 * SC/OC/SUPERADMIN — Top-3 Kasuh suggestions per MABA → SC picks → commit.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { Heart, ChevronRight, CheckCircle2 } from 'lucide-react';

const log = createLogger('admin-kasuh-suggest');

type Step = 'config' | 'pick' | 'done';

interface KasuhSuggestion {
  kasuhUserId: string;
  kasuhName: string;
  score: number;
  reasons: string[];
  lowMatch: boolean;
}

interface MabaSuggestions {
  mabaUserId: string;
  mabaName: string;
  topKasuh: KasuhSuggestion[];
}

export default function KasuhSuggestPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('config');
  const [cohortId, setCohortId] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewToken, setPreviewToken] = useState('');
  const [suggestions, setSuggestions] = useState<MabaSuggestions[]>([]);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [committedCount, setCommittedCount] = useState(0);

  async function handleGenerate() {
    if (!cohortId.trim()) {
      toast.error('Masukkan ID Kohort');
      return;
    }
    setLoading(true);
    try {
      log.info('Generating Kasuh suggestions', { cohortId });
      const res = await fetch('/api/admin/struktur/kasuh-pairs/suggest/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cohortId }),
      });
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      const json = await res.json();
      setPreviewToken(json.data.previewToken);
      setSuggestions(json.data.suggestions ?? []);
      // Initialize picks with top-1 suggestion per MABA
      const initialPicks: Record<string, string> = {};
      for (const s of json.data.suggestions ?? []) {
        if (s.topKasuh && s.topKasuh.length > 0) {
          initialPicks[s.mabaUserId] = s.topKasuh[0].kasuhUserId;
        }
      }
      setPicks(initialPicks);
      setStep('pick');
    } catch (err) {
      log.error('Generate failed', { err });
      toast.error('Gagal menghasilkan saran Kasuh');
    } finally {
      setLoading(false);
    }
  }

  async function handleCommit() {
    const picksArray = Object.entries(picks)
      .filter(([, kasuhUserId]) => kasuhUserId)
      .map(([mabaUserId, kasuhUserId]) => ({ mabaUserId, kasuhUserId }));

    if (picksArray.length === 0) {
      toast.error('Pilih minimal 1 pasangan sebelum commit');
      return;
    }

    setLoading(true);
    try {
      log.info('Committing Kasuh picks', { count: picksArray.length });
      const res = await fetch('/api/admin/struktur/kasuh-pairs/suggest/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ previewToken, cohortId, picks: picksArray }),
      });
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      const json = await res.json();
      setCommittedCount(json.data.created ?? picksArray.length);
      setStep('done');
      toast.success('Kasuh pair berhasil disimpan');
    } catch (err) {
      log.error('Commit failed', { err });
      toast.error('Gagal menyimpan Kasuh pair');
    } finally {
      setLoading(false);
    }
  }

  const pickedCount = Object.values(picks).filter(Boolean).length;

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <DynamicBreadcrumb />

      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white">
          <Heart className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Suggest Kasuh</h1>
          <p className="text-sm text-gray-500">Top-3 Kasuh per MABA berdasarkan Jaccard similarity</p>
        </div>
      </div>

      {/* Step: Config */}
      {step === 'config' && (
        <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-5 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              ID Kohort <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={cohortId}
              onChange={(e) => setCohortId(e.target.value)}
              placeholder="Masukkan ID Kohort..."
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
          <Button
            onClick={handleGenerate}
            disabled={loading || !cohortId.trim()}
            className="bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl w-full"
          >
            {loading ? 'Menghasilkan saran...' : 'Generate Saran Kasuh'}
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}

      {/* Step: Pick */}
      {step === 'pick' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-sky-100 dark:border-sky-900 bg-sky-50 dark:bg-sky-900/10 p-3">
            <p className="text-sm text-sky-800 dark:text-sky-200">
              {suggestions.length} MABA belum di-assign. Pilih Kasuh terbaik untuk masing-masing.
            </p>
          </div>

          {suggestions.map((s) => (
            <div
              key={s.mabaUserId}
              className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-4 shadow-sm"
            >
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
                MABA: {s.mabaName}
              </p>
              <div className="space-y-2">
                {s.topKasuh.map((k) => (
                  <button
                    key={k.kasuhUserId}
                    type="button"
                    onClick={() => setPicks((prev) => ({ ...prev, [s.mabaUserId]: k.kasuhUserId }))}
                    className={`w-full p-3 rounded-xl border text-left transition-colors ${
                      picks[s.mabaUserId] === k.kasuhUserId
                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-sky-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {k.kasuhName}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {k.reasons.join(', ') || 'tidak ada alasan'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {k.lowMatch && (
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">Low Match</Badge>
                        )}
                        <span className="text-sm font-semibold text-sky-600">
                          {(k.score * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
                {s.topKasuh.length === 0 && (
                  <p className="text-xs text-gray-400 italic">Tidak ada Kasuh tersedia untuk MABA ini.</p>
                )}
              </div>
            </div>
          ))}

          <div className="flex items-center gap-3 pt-2">
            <Button variant="outline" onClick={() => setStep('config')} disabled={loading}>
              Kembali
            </Button>
            <Button
              onClick={handleCommit}
              disabled={loading || pickedCount === 0}
              className="bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl flex-1"
            >
              {loading ? 'Menyimpan...' : `Commit ${pickedCount} Pasangan`}
            </Button>
          </div>
        </div>
      )}

      {/* Step: Done */}
      {step === 'done' && (
        <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/10 p-8 text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
          <div>
            <p className="text-xl font-bold text-emerald-800 dark:text-emerald-200">Berhasil!</p>
            <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
              {committedCount} pasangan Kasuh berhasil disimpan.
            </p>
          </div>
          <Button
            onClick={() => router.push('/admin/struktur/kasuh-pairing')}
            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
          >
            Lihat Daftar Kasuh Pair
          </Button>
        </div>
      )}
    </div>
  );
}
