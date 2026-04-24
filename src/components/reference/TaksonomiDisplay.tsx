/**
 * src/components/reference/TaksonomiDisplay.tsx
 * Bilingual taxonomy display grouped by TaxonomyGroup.
 */

import React from 'react';

interface TaxonomyMetaItem {
  id: string;
  group: string;
  labelId: string;
  labelEn: string;
  deskripsi: string | null;
  displayOrder: number;
}

interface TaksonomiDisplayProps {
  items: TaxonomyMetaItem[];
}

const GROUP_LABELS: Record<string, string> = {
  NILAI: 'Nilai',
  DIMENSI: 'Dimensi',
  FASE: 'Fase',
  KATEGORI: 'Kategori',
};

const GROUP_STYLES: Record<string, string> = {
  NILAI: 'border-sky-200 dark:border-sky-800',
  DIMENSI: 'border-blue-200 dark:border-blue-800',
  FASE: 'border-violet-200 dark:border-violet-800',
  KATEGORI: 'border-emerald-200 dark:border-emerald-800',
};

export function TaksonomiDisplay({ items }: TaksonomiDisplayProps) {
  // Group by group
  const grouped = items.reduce<Record<string, TaxonomyMetaItem[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  const groupOrder = ['NILAI', 'DIMENSI', 'FASE', 'KATEGORI'];

  return (
    <div className="space-y-8">
      {groupOrder.map((group) => {
        const groupItems = grouped[group];
        if (!groupItems || groupItems.length === 0) return null;

        const sorted = [...groupItems].sort((a, b) => a.displayOrder - b.displayOrder);

        return (
          <div key={group}>
            <h2 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
              {GROUP_LABELS[group] ?? group} ({sorted.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sorted.map((item) => (
                <div
                  key={item.id}
                  className={`bg-white dark:bg-slate-800 rounded-xl border-l-4 ${GROUP_STYLES[group] ?? ''} border border-gray-100 dark:border-slate-700 p-4`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-mono text-gray-500 dark:text-gray-500">{item.id}</span>
                      <div className="font-semibold text-sm text-gray-800 dark:text-gray-200">{item.labelId}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 italic">{item.labelEn}</div>
                    </div>
                  </div>
                  {item.deskripsi && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">{item.deskripsi}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
