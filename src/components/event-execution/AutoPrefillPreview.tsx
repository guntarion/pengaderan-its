'use client';

/**
 * src/components/event-execution/AutoPrefillPreview.tsx
 * NAWASENA M08 — Read-only preview of Kegiatan master fields.
 *
 * Shows: tujuan list, KPI summary, safeguard notes, picRoleHint.
 * Collapsible to save space.
 */

import { useState, useEffect } from 'react';
import { ChevronDownIcon, ChevronUpIcon, TargetIcon, ShieldIcon, UserIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface PrefillData {
  id: string;
  nama: string;
  deskripsiFull: string | null;
  rasional: string;
  safeguardNotes: string | null;
  picRoleHint: string | null;
  intensity: string;
  scale: string;
  durasiMenit: number;
  tujuan: Array<{ id: string; tujuanText: string; bloomLevel: string | null }>;
  kpiDefs: Array<{ id: string; namaKPI: string; satuan: string | null }>;
}

interface AutoPrefillPreviewProps {
  kegiatanId: string | null;
}

export function AutoPrefillPreview({ kegiatanId }: AutoPrefillPreviewProps) {
  const [data, setData] = useState<PrefillData | null>(null);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!kegiatanId) {
      setData(null);
      return;
    }
    setLoading(true);
    fetch(`/api/kegiatan/${kegiatanId}/detail`)
      .then((r) => r.json())
      .then((json) => {
        setData(json.data ?? null);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [kegiatanId]);

  if (!kegiatanId) return null;

  if (loading) {
    return (
      <div className="rounded-xl border border-sky-100 dark:border-sky-900 bg-sky-50/50 dark:bg-sky-950/20 p-4 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="rounded-xl border border-sky-100 dark:border-sky-900 bg-sky-50/50 dark:bg-sky-950/20">
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-2">
          <TargetIcon className="h-4 w-4 text-sky-500" />
          <span className="text-sm font-semibold text-sky-700 dark:text-sky-300">
            Preview dari Katalog Kegiatan
          </span>
        </div>
        {collapsed ? (
          <ChevronDownIcon className="h-4 w-4 text-sky-400" />
        ) : (
          <ChevronUpIcon className="h-4 w-4 text-sky-400" />
        )}
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-3 border-t border-sky-100 dark:border-sky-900 pt-3">
          {/* Metadata badges */}
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="text-xs">{data.intensity}</Badge>
            <Badge variant="secondary" className="text-xs">{data.scale}</Badge>
            <Badge variant="secondary" className="text-xs">{data.durasiMenit} menit</Badge>
          </div>

          {/* Rasional */}
          {data.rasional && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Rasional</p>
              <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-3">{data.rasional}</p>
            </div>
          )}

          {/* Tujuan */}
          {data.tujuan.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Tujuan ({data.tujuan.length})
              </p>
              <ul className="space-y-1">
                {data.tujuan.slice(0, 3).map((t) => (
                  <li key={t.id} className="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-1.5">
                    <span className="text-sky-400 mt-0.5">•</span>
                    <span className="line-clamp-2">{t.tujuanText}</span>
                  </li>
                ))}
                {data.tujuan.length > 3 && (
                  <li className="text-xs text-gray-400">+ {data.tujuan.length - 3} tujuan lainnya</li>
                )}
              </ul>
            </div>
          )}

          {/* Safeguard notes */}
          {data.safeguardNotes && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-3 py-2">
              <ShieldIcon className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400">{data.safeguardNotes}</p>
            </div>
          )}

          {/* PIC hint */}
          {data.picRoleHint && (
            <div className="flex items-center gap-2">
              <UserIcon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                PIC Role Hint: <span className="font-medium">{data.picRoleHint}</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
