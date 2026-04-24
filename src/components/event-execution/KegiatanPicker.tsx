'use client';

/**
 * src/components/event-execution/KegiatanPicker.tsx
 * NAWASENA M08 — Searchable picker for selecting a Kegiatan master.
 *
 * Features:
 * - Debounced search input
 * - Fase filter chips
 * - Shows deskripsiSingkat + fase as secondary text
 * - No Command component dependency (not installed)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { CheckIcon, SearchIcon, ChevronDownIcon, XIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';

interface KegiatanOption {
  id: string;
  nama: string;
  deskripsiSingkat: string;
  fase: string;
  kategori: string;
  intensity: string;
  picRoleHint: string | null;
}

interface KegiatanPickerProps {
  value: string | null;
  onChange: (kegiatanId: string | null, kegiatan: KegiatanOption | null) => void;
  disabled?: boolean;
}

const FASE_OPTIONS = ['F0_PRA', 'F1_FOUNDATION', 'F2_CHALLENGE', 'F3_PEAK', 'F4_INTEGRATION'];
const FASE_LABELS: Record<string, string> = {
  F0_PRA: 'F0 Pra',
  F1_FOUNDATION: 'F1 Foundation',
  F2_CHALLENGE: 'F2 Challenge',
  F3_PEAK: 'F3 Peak',
  F4_INTEGRATION: 'F4 Integration',
};

export function KegiatanPicker({ value, onChange, disabled }: KegiatanPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [faseFilter, setFaseFilter] = useState<string | null>(null);
  const [options, setOptions] = useState<KegiatanOption[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedOption, setSelectedOption] = useState<KegiatanOption | null>(null);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchOptions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (faseFilter) params.set('fase', faseFilter);
      params.set('limit', '30');
      const res = await fetch(`/api/event-execution/kegiatan-picker?${params}`);
      if (!res.ok) {
        toast.apiError(await res.json());
        return;
      }
      const data = await res.json();
      setOptions(data.data ?? []);
    } catch (err) {
      toast.apiError(err);
    } finally {
      setLoading(false);
    }
  }, [search, faseFilter]);

  useEffect(() => {
    if (open) {
      const timeout = setTimeout(fetchOptions, 250);
      return () => clearTimeout(timeout);
    }
  }, [open, fetchOptions, search, faseFilter]);

  const handleSelect = (option: KegiatanOption) => {
    if (option.id === value) {
      onChange(null, null);
      setSelectedOption(null);
    } else {
      onChange(option.id, option);
      setSelectedOption(option);
    }
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null, null);
    setSelectedOption(null);
  };

  return (
    <div ref={containerRef} className="space-y-2 relative">
      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5">
        <span className="text-xs text-gray-500 dark:text-gray-400 self-center">Filter fase:</span>
        {FASE_OPTIONS.map((fase) => (
          <button
            key={fase}
            type="button"
            onClick={() => setFaseFilter(faseFilter === fase ? null : fase)}
            className={cn(
              'text-xs px-2 py-0.5 rounded-full border transition-colors',
              faseFilter === fase
                ? 'bg-sky-500 text-white border-sky-500'
                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-sky-400',
            )}
          >
            {FASE_LABELS[fase]}
          </button>
        ))}
      </div>

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl border transition-colors text-left',
          'bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 hover:border-sky-400 dark:hover:border-sky-600',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        {selectedOption ? (
          <span className="flex items-center gap-2 flex-1 min-w-0">
            <Badge variant="secondary" className="text-xs shrink-0">
              {FASE_LABELS[selectedOption.fase] ?? selectedOption.fase}
            </Badge>
            <span className="line-clamp-1 text-gray-800 dark:text-gray-200">{selectedOption.nama}</span>
          </span>
        ) : (
          <span className="text-gray-400 flex items-center gap-2">
            <SearchIcon className="h-4 w-4 shrink-0" />
            Cari dan pilih kegiatan...
          </span>
        )}
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {selectedOption && (
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 p-0.5"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDownIcon className="h-4 w-4 text-gray-400" />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-sky-100 dark:border-sky-900 rounded-xl shadow-lg max-h-72 overflow-hidden flex flex-col">
          {/* Search input */}
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <SearchIcon className="h-4 w-4 text-gray-400 shrink-0" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama kegiatan..."
                className="flex-1 text-sm bg-transparent text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none"
              />
            </div>
          </div>

          {/* Options list */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                Memuat...
              </div>
            ) : options.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                Tidak ada kegiatan ditemukan.
              </div>
            ) : (
              options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-sky-50 dark:hover:bg-sky-950/20 text-left transition-colors"
                >
                  <CheckIcon
                    className={cn(
                      'mt-0.5 h-4 w-4 shrink-0 text-sky-500',
                      value === option.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs text-sky-600 dark:text-sky-400 shrink-0">
                        {FASE_LABELS[option.fase] ?? option.fase}
                      </span>
                      <span className="text-xs text-gray-400">{option.id}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-1">
                      {option.nama}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                      {option.deskripsiSingkat}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
