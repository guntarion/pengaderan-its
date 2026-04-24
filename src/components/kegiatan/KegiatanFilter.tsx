/**
 * src/components/kegiatan/KegiatanFilter.tsx
 * Client-side filter sidebar for the kegiatan catalog.
 * Uses URL search params for shareable filter state.
 */

'use client';

import React, { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface FilterOption {
  value: string;
  label: string;
}

const FASE_OPTIONS: FilterOption[] = [
  { value: 'PRAPELAKSANAAN', label: 'Pra-Pelaksanaan' },
  { value: 'PELAKSANAAN', label: 'Pelaksanaan' },
  { value: 'PASCAPELAKSANAAN', label: 'Pasca-Pelaksanaan' },
  { value: 'LINTAS_FASE', label: 'Lintas Fase' },
];

const NILAI_OPTIONS: FilterOption[] = [
  { value: 'K1', label: 'K1 — Kepemimpinan' },
  { value: 'K2', label: 'K2 — Komunikasi' },
  { value: 'K3', label: 'K3 — Kolaborasi' },
  { value: 'K4', label: 'K4 — Keilmuan' },
  { value: 'K5', label: 'K5 — Kreatifitas' },
  { value: 'K6', label: 'K6 — Ketaqwaan' },
  { value: 'K7', label: 'K7 — Kepribadian' },
];

const INTENSITY_OPTIONS: FilterOption[] = [
  { value: 'RINGAN', label: 'Ringan' },
  { value: 'SEDANG', label: 'Sedang' },
  { value: 'BERAT', label: 'Berat' },
];

const SCALE_OPTIONS: FilterOption[] = [
  { value: 'INDIVIDU', label: 'Individu' },
  { value: 'TIM', label: 'Tim' },
  { value: 'DIVISI', label: 'Divisi' },
  { value: 'ORGANISASI', label: 'Organisasi' },
];

interface FilterGroupProps {
  title: string;
  paramKey: string;
  options: FilterOption[];
  activeValues: string[];
  onToggle: (paramKey: string, value: string) => void;
}

function FilterGroup({ title, paramKey, options, activeValues, onToggle }: FilterGroupProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
        {title}
      </h4>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = activeValues.includes(opt.value);
          return (
            <button
              key={opt.value}
              onClick={() => onToggle(paramKey, opt.value)}
              className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
                active
                  ? 'bg-sky-500 text-white border-sky-500'
                  : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-600 hover:border-sky-300 dark:hover:border-sky-600'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function KegiatanFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const getActiveValues = useCallback(
    (key: string): string[] => {
      const val = searchParams.get(key);
      return val ? val.split(',').filter(Boolean) : [];
    },
    [searchParams],
  );

  const handleToggle = useCallback(
    (paramKey: string, value: string) => {
      const current = getActiveValues(paramKey);
      let next: string[];
      if (current.includes(value)) {
        next = current.filter((v) => v !== value);
      } else {
        next = [...current, value];
      }

      const params = new URLSearchParams(searchParams.toString());
      if (next.length > 0) {
        params.set(paramKey, next.join(','));
      } else {
        params.delete(paramKey);
      }

      router.push(`/kegiatan?${params.toString()}`);
    },
    [searchParams, router, getActiveValues],
  );

  const hasActiveFilters =
    ['fase', 'nilai', 'intensity', 'scale'].some((k) => searchParams.has(k));

  const clearFilters = useCallback(() => {
    router.push('/kegiatan');
  }, [router]);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-200">Filter</h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-sky-600 dark:text-sky-400 hover:underline"
          >
            Hapus semua
          </button>
        )}
      </div>

      <FilterGroup
        title="Fase"
        paramKey="fase"
        options={FASE_OPTIONS}
        activeValues={getActiveValues('fase')}
        onToggle={handleToggle}
      />

      <FilterGroup
        title="Nilai"
        paramKey="nilai"
        options={NILAI_OPTIONS}
        activeValues={getActiveValues('nilai')}
        onToggle={handleToggle}
      />

      <FilterGroup
        title="Intensitas"
        paramKey="intensity"
        options={INTENSITY_OPTIONS}
        activeValues={getActiveValues('intensity')}
        onToggle={handleToggle}
      />

      <FilterGroup
        title="Skala"
        paramKey="scale"
        options={SCALE_OPTIONS}
        activeValues={getActiveValues('scale')}
        onToggle={handleToggle}
      />
    </div>
  );
}
