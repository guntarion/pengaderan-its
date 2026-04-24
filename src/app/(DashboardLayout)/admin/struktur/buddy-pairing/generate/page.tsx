'use client';

/**
 * /admin/struktur/buddy-pairing/generate
 * OC/SC/SUPERADMIN — generate buddy pairs + preview swap + commit.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { Users2, ChevronRight, CheckCircle2, ArrowLeftRight } from 'lucide-react';

const log = createLogger('admin-buddy-generate');

type Step = 'config' | 'preview' | 'done';

interface BuddyPairPreview {
  mabaAId: string;
  mabaAName: string;
  mabaBId: string;
  mabaBName: string;
  isTriple?: boolean;
}

interface PreviewData {
  pairs: BuddyPairPreview[];
  crossRatio: number;
  unpairedCount: number;
  seed: string;
  algorithmVersion: string;
}

export default function BuddyGeneratePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('config');
  const [cohortId, setCohortId] = useState('');
  const [seed, setSeed] = useState('');
  const [oddStrategy, setOddStrategy] = useState<'triple' | 'unassigned'>('triple');
  const [loading, setLoading] = useState(false);
  const [previewToken, setPreviewToken] = useState('');
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [committedCount, setCommittedCount] = useState(0);

  async function handlePreview() {
    if (!cohortId.trim()) {
      toast.error('Masukkan ID Kohort');
      return;
    }
    setLoading(true);
    try {
      log.info('Generating buddy pairs preview', { cohortId });
      const res = await fetch('/api/admin/struktur/buddy-pairs/generate/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cohortId, seed: seed || undefined, oddStrategy }),
      });
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      const json = await res.json();
      setPreviewToken(json.data.previewToken);
      setPreview(json.data);
      setStep('preview');
    } catch (err) {
      log.error('Preview failed', { err });
      toast.error('Gagal menghasilkan preview buddy pair');
    } finally {
      setLoading(false);
    }
  }

  async function handleCommit() {
    setLoading(true);
    try {
      log.info('Committing buddy pairs', { previewToken });
      const res = await fetch('/api/admin/struktur/buddy-pairs/generate/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ previewToken, cohortId }),
      });
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      const json = await res.json();
      setCommittedCount(json.data.created ?? preview?.pairs.length ?? 0);
      setStep('done');
      toast.success('Buddy pair berhasil disimpan');
    } catch (err) {
      log.error('Commit failed', { err });
      toast.error('Gagal menyimpan buddy pair');
    } finally {
      setLoading(false);
    }
  }

  const crossPct = preview ? Math.round(preview.crossRatio * 100) : 0;

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <DynamicBreadcrumb />

      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white">
          <Users2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Generate Buddy Pair</h1>
          <p className="text-sm text-gray-500">Algoritma greedy bipartite + optimasi lintas-jurusan</p>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 text-sm">
        {(['config', 'preview', 'done'] as Step[]).map((s, idx) => (
          <div key={s} className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full font-medium ${
                step === s
                  ? 'bg-sky-500 text-white'
                  : idx < ['config', 'preview', 'done'].indexOf(step)
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {idx + 1}. {s === 'config' ? 'Konfigurasi' : s === 'preview' ? 'Preview' : 'Selesai'}
            </span>
            {idx < 2 && <ChevronRight className="h-4 w-4 text-gray-400" />}
          </div>
        ))}
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
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Seed (opsional)
            </label>
            <input
              type="text"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder="Biarkan kosong untuk random seed..."
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            <p className="text-xs text-gray-400 mt-1">Gunakan seed yang sama untuk hasil yang identik</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Strategi Jumlah Ganjil
            </label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { value: 'triple', label: 'Triple Pair', desc: 'Pasangan 3 orang untuk 1 MABA sisa' },
                { value: 'unassigned', label: 'Tidak Di-assign', desc: 'MABA sisa dibiarkan tanpa pasangan' },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setOddStrategy(opt.value)}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    oddStrategy === opt.value
                      ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-sky-300'
                  }`}
                >
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{opt.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <Button
            onClick={handlePreview}
            disabled={loading || !cohortId.trim()}
            className="bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl w-full"
          >
            {loading ? 'Menghasilkan preview...' : 'Generate Preview'}
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}

      {/* Step: Preview */}
      {step === 'preview' && preview && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-sky-700 dark:text-sky-400">{preview.pairs.length}</p>
              <p className="text-xs text-gray-500 mt-1">Pasangan</p>
            </div>
            <div className={`rounded-2xl border p-4 text-center shadow-sm ${
              crossPct >= 80
                ? 'border-emerald-100 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/10'
                : 'border-amber-100 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/10'
            }`}>
              <p className={`text-2xl font-bold ${crossPct >= 80 ? 'text-emerald-700' : 'text-amber-700'}`}>
                {crossPct}%
              </p>
              <p className="text-xs text-gray-500 mt-1">Lintas Jurusan</p>
            </div>
            <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{preview.unpairedCount}</p>
              <p className="text-xs text-gray-500 mt-1">Tidak Dipasangkan</p>
            </div>
          </div>

          {crossPct < 80 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/10 p-3">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Cross ratio {crossPct}% di bawah target 80%. Pertimbangkan seed yang berbeda.
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-sky-50 dark:border-sky-900 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Preview Pasangan ({preview.pairs.length})
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-sky-50 dark:divide-sky-900">
              {preview.pairs.map((p, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{p.mabaAName}</span>
                  <div className="flex items-center gap-2">
                    <ArrowLeftRight className="h-3.5 w-3.5 text-gray-400" />
                    {p.isTriple && <Badge className="bg-violet-100 text-violet-700 border-violet-200 text-xs">Triple</Badge>}
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{p.mabaBName}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-400 font-mono">Seed: {preview.seed} | {preview.algorithmVersion}</p>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setStep('config')} disabled={loading}>
              Kembali
            </Button>
            <Button
              onClick={handleCommit}
              disabled={loading || preview.pairs.length === 0}
              className="bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl flex-1"
            >
              {loading ? 'Menyimpan...' : `Commit ${preview.pairs.length} Pasangan`}
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
              {committedCount} pasangan buddy berhasil disimpan ke database.
            </p>
          </div>
          <Button
            onClick={() => router.push('/admin/struktur/buddy-pairing')}
            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
          >
            Lihat Daftar Buddy Pair
          </Button>
        </div>
      )}
    </div>
  );
}
