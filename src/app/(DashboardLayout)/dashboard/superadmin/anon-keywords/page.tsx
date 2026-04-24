'use client';

/**
 * /dashboard/superadmin/anon-keywords
 * NAWASENA M12 — SUPERADMIN keyword config editor.
 *
 * Allows editing severe_keywords (auto-escalation) and filtered_keywords
 * (low-quality rejection). All changes are audited via M01 auditLog.
 */

import { useEffect, useState } from 'react';
import { DynamicBreadcrumb } from '@/components/shared/DynamicBreadcrumb';
import { SkeletonCard } from '@/components/shared/skeletons';
import { toast } from '@/lib/toast';
import { createLogger } from '@/lib/logger';
import { Settings, Save, Info } from 'lucide-react';

const log = createLogger('superadmin-anon-keywords-page');

interface ConfigEntry {
  id: string;
  key: string;
  value: unknown;
  updatedById?: string | null;
  updatedAt: string;
}

const CONFIG_DESCRIPTIONS: Record<string, { label: string; desc: string }> = {
  severe_keywords: {
    label: 'Kata Kunci Kritis (Auto-Eskalasi)',
    desc: 'Laporan yang mengandung kata kunci ini akan otomatis dieskalasi ke Satgas PPKPT. Pisahkan dengan koma.',
  },
  filtered_keywords: {
    label: 'Kata Kunci Filter (Tolak Otomatis)',
    desc: 'Laporan dengan rasio kata-kata ini melebihi threshold akan ditolak sebagai spam/kualitas rendah.',
  },
};

function parseKeywords(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'keywords' in value) {
    const kw = (value as { keywords: unknown }).keywords;
    if (Array.isArray(kw)) return kw.join(', ');
  }
  return '';
}

function keywordsToArray(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export default function AnonKeywordsPage() {
  const [configs, setConfigs] = useState<ConfigEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/anon-reports/superadmin/keyword-config')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setConfigs(data.data);
          const initial: Record<string, string> = {};
          for (const c of data.data as ConfigEntry[]) {
            initial[c.key] = parseKeywords(c.value);
          }
          setEditing(initial);
          log.info('Keyword configs loaded', { count: data.data.length });
        } else {
          toast.error(data.error?.message ?? 'Gagal memuat konfigurasi');
        }
      })
      .catch((err) => {
        log.error('Failed to load keyword configs', { error: err });
        toast.apiError(err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (key: string) => {
    const raw = editing[key] ?? '';
    const keywords = keywordsToArray(raw);

    if (keywords.length === 0) {
      toast.error('Minimal satu kata kunci diperlukan');
      return;
    }

    setSaving((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await fetch('/api/anon-reports/superadmin/keyword-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: { keywords } }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error?.message);

      toast.success(`Konfigurasi "${key}" berhasil disimpan`);

      // Update local state with response
      setConfigs((prev) =>
        prev.map((c) => (c.key === key ? { ...c, ...data.data } : c)),
      );
      log.info('Keyword config saved', { key, count: keywords.length });
    } catch (err) {
      toast.apiError(err);
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  if (loading) return <div className="p-6"><SkeletonCard /></div>;

  // Show all known config keys even if not in DB yet
  const knownKeys = Object.keys(CONFIG_DESCRIPTIONS);
  const allKeys = Array.from(
    new Set([...knownKeys, ...configs.map((c) => c.key)]),
  );

  return (
    <div className="space-y-6 p-6">
      <DynamicBreadcrumb />

      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-sky-500" />
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Konfigurasi Kata Kunci Laporan Anonim
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Atur kata kunci untuk auto-eskalasi dan filter kualitas laporan.
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/20">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
        <p className="text-xs text-blue-700 dark:text-blue-300">
          Perubahan kata kunci berlaku secara langsung untuk laporan baru. Laporan yang sudah ada tidak akan terpengaruh.
          Setiap perubahan diaudit dalam sistem.
        </p>
      </div>

      {/* Config cards */}
      <div className="space-y-4">
        {allKeys.map((key) => {
          const meta = CONFIG_DESCRIPTIONS[key];
          const configEntry = configs.find((c) => c.key === key);
          const currentValue = editing[key] ?? '';
          const isSaving = saving[key] ?? false;

          const keywords = keywordsToArray(currentValue);
          const isDirty = configEntry
            ? currentValue !== parseKeywords(configEntry.value)
            : currentValue.length > 0;

          return (
            <div
              key={key}
              className="rounded-2xl border border-sky-100 bg-white p-5 dark:border-sky-900 dark:bg-gray-900"
            >
              <div className="mb-1 flex items-start justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {meta?.label ?? key}
                  </h2>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {meta?.desc ?? `Konfigurasi untuk key: ${key}`}
                  </p>
                </div>
                {configEntry?.updatedAt && (
                  <span className="shrink-0 text-xs text-gray-400">
                    Diperbarui {new Date(configEntry.updatedAt).toLocaleDateString('id-ID')}
                  </span>
                )}
              </div>

              <div className="mt-3">
                <textarea
                  value={currentValue}
                  onChange={(e) =>
                    setEditing((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  rows={3}
                  placeholder="Masukkan kata kunci, pisahkan dengan koma..."
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 font-mono text-sm text-gray-700 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                />
                <p className="mt-1 text-xs text-gray-400">
                  {keywords.length} kata kunci
                  {isDirty && (
                    <span className="ml-2 text-amber-500">· Belum disimpan</span>
                  )}
                </p>
              </div>

              {/* Preview chips */}
              {keywords.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {keywords.map((kw) => (
                    <span
                      key={kw}
                      className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => void handleSave(key)}
                  disabled={isSaving || !isDirty}
                  className="flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
