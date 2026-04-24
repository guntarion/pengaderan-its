/**
 * src/components/event/InstanceFilter.tsx
 * Filter bar for event instance listing (Fase + Kategori).
 */

'use client';

import React from 'react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

interface InstanceFilterProps {
  fase: string;
  kategori: string;
  onFaseChange: (v: string) => void;
  onKategoriChange: (v: string) => void;
}

const FASE_OPTIONS = ['all', '1', '2', '3', '4'];
const KATEGORI_OPTIONS = ['all', 'Wajib', 'Pilihan', 'Mandiri'];

export function InstanceFilter({ fase, kategori, onFaseChange, onKategoriChange }: InstanceFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Select value={fase} onValueChange={onFaseChange}>
        <SelectTrigger className="w-36 text-sm rounded-xl border-sky-200 dark:border-sky-800">
          <SelectValue placeholder="Semua Fase" />
        </SelectTrigger>
        <SelectContent>
          {FASE_OPTIONS.map((f) => (
            <SelectItem key={f} value={f}>
              {f === 'all' ? 'Semua Fase' : `Fase ${f}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={kategori} onValueChange={onKategoriChange}>
        <SelectTrigger className="w-36 text-sm rounded-xl border-sky-200 dark:border-sky-800">
          <SelectValue placeholder="Semua Kategori" />
        </SelectTrigger>
        <SelectContent>
          {KATEGORI_OPTIONS.map((k) => (
            <SelectItem key={k} value={k}>
              {k === 'all' ? 'Semua Kategori' : k}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
