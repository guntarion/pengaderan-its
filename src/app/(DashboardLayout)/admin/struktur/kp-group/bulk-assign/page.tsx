'use client';

/**
 * /admin/struktur/kp-group/bulk-assign
 * SC/OC — bulk assign MABA ke KP Group (3-step wizard: config → preview → commit).
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { Network, ChevronRight, CheckCircle2 } from 'lucide-react';

const log = createLogger('admin-kp-group-bulk-assign');

type Step = 'config' | 'preview' | 'done';

interface AssignmentPreview {
  kpGroupId: string;
  kpGroupCode: string;
  kpGroupName: string;
  mabaUserId: string;
  mabaName: string;
}

export default function BulkAssignPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('config');
  const [cohortId, setCohortId] = useState('');
  const [mode, setMode] = useState<'round-robin' | 'random-seeded' | 'stratified'>('round-robin');
  const [seed, setSeed] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewToken, setPreviewToken] = useState('');
  const [assignments, setAssignments] = useState<AssignmentPreview[]>([]);
  const [committedCount, setCommittedCount] = useState(0);

  async function handlePreview() {
    if (!cohortId.trim()) {
      toast.error('Masukkan ID Kohort');
      return;
    }
    setLoading(true);
    try {
      log.info('Generating bulk assign preview', { cohortId, mode });
      const res = await fetch('/api/admin/struktur/kp-groups/bulk-assign/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cohortId, mode, seed: seed || undefined }),
      });
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      const json = await res.json();
      setPreviewToken(json.data.previewToken);
      setAssignments(json.data.assignments ?? []);
      setStep('preview');
    } catch (err) {
      log.error('Preview failed', { err });
      toast.error('Gagal menghasilkan preview');
    } finally {
      setLoading(false);
    }
  }

  async function handleCommit() {
    setLoading(true);
    try {
      log.info('Committing bulk assign', { previewToken });
      const res = await fetch('/api/admin/struktur/kp-groups/bulk-assign/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ previewToken, cohortId }),
      });
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      const json = await res.json();
      setCommittedCount(json.data.created ?? assignments.length);
      setStep('done');
      toast.success('Bulk assign berhasil disimpan');
    } catch (err) {
      log.error('Commit failed', { err });
      toast.error('Gagal menyimpan bulk assign');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <DynamicBreadcrumb />

      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white">
          <Network className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Bulk Assign MABA ke KP Group</h1>
          <p className="text-sm text-gray-500">Distribusi otomatis menggunakan algoritma pilihan</p>
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Mode Distribusi
            </label>
            <div className="grid grid-cols-3 gap-3">
              {([
                { value: 'round-robin', label: 'Round Robin', desc: 'Berurutan merata' },
                { value: 'random-seeded', label: 'Random Seeded', desc: 'Acak + dapat diulang' },
                { value: 'stratified', label: 'Stratified', desc: 'Berdasarkan strata' },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMode(opt.value)}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    mode === opt.value
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
          {mode === 'random-seeded' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Seed (opsional)
              </label>
              <input
                type="text"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                placeholder="Biarkan kosong untuk auto-generate..."
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
          )}
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
      {step === 'preview' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-100 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/10 p-4">
            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
              Preview: {assignments.length} penugasan akan dibuat. Tinjau sebelum commit.
            </p>
          </div>
          <div className="rounded-2xl border border-sky-100 dark:border-sky-900 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-sky-50 dark:border-sky-900 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Daftar Penugasan ({assignments.length})
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-sky-50 dark:divide-sky-900">
              {assignments.length === 0 ? (
                <p className="p-6 text-center text-sm text-gray-400">Tidak ada penugasan yang dapat dibuat.</p>
              ) : (
                assignments.map((a, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{a.mabaName}</span>
                    <Badge className="bg-sky-100 text-sky-800 border-sky-200 text-xs">{a.kpGroupCode}</Badge>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setStep('config')}
              disabled={loading}
            >
              Kembali
            </Button>
            <Button
              onClick={handleCommit}
              disabled={loading || assignments.length === 0}
              className="bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl flex-1"
            >
              {loading ? 'Menyimpan...' : `Commit ${assignments.length} Penugasan`}
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
              {committedCount} anggota berhasil di-assign ke KP Group.
            </p>
          </div>
          <Button
            onClick={() => router.push('/admin/struktur/kp-group')}
            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
          >
            Lihat Daftar KP Group
          </Button>
        </div>
      )}
    </div>
  );
}
