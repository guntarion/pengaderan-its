/**
 * src/components/anon-report/CategoryPicker.tsx
 * NAWASENA M12 — Category radio group for anonymous report form.
 */

'use client';

import { AnonCategory } from '@prisma/client';
import { AlertTriangle, MessageCircleWarning, Scale, Lightbulb, HelpCircle } from 'lucide-react';

interface CategoryPickerProps {
  value: AnonCategory | '';
  onChange: (value: AnonCategory) => void;
  error?: string;
}

const CATEGORIES: {
  value: AnonCategory;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  border: string;
  selectedBorder: string;
  selectedBg: string;
}[] = [
  {
    value: AnonCategory.BULLYING,
    label: 'Perundungan (Bullying)',
    description: 'Intimidasi, ejekan, atau tindakan merendahkan berulang',
    icon: AlertTriangle,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-950/20',
    border: 'border-orange-100 dark:border-orange-900',
    selectedBorder: 'border-orange-400',
    selectedBg: 'bg-orange-50 dark:bg-orange-950/40',
  },
  {
    value: AnonCategory.HARASSMENT,
    label: 'Pelecehan (Harassment)',
    description: 'Pelecehan seksual, verbal, atau fisik',
    icon: MessageCircleWarning,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/20',
    border: 'border-red-100 dark:border-red-900',
    selectedBorder: 'border-red-400',
    selectedBg: 'bg-red-50 dark:bg-red-950/40',
  },
  {
    value: AnonCategory.UNFAIR,
    label: 'Ketidakadilan',
    description: 'Perlakuan tidak adil, diskriminasi, atau pelanggaran hak',
    icon: Scale,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    border: 'border-amber-100 dark:border-amber-900',
    selectedBorder: 'border-amber-400',
    selectedBg: 'bg-amber-50 dark:bg-amber-950/40',
  },
  {
    value: AnonCategory.SUGGESTION,
    label: 'Saran / Masukan',
    description: 'Masukan konstruktif untuk perbaikan program',
    icon: Lightbulb,
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-950/20',
    border: 'border-sky-100 dark:border-sky-900',
    selectedBorder: 'border-sky-400',
    selectedBg: 'bg-sky-50 dark:bg-sky-950/40',
  },
  {
    value: AnonCategory.OTHER,
    label: 'Lainnya',
    description: 'Masalah lain yang tidak masuk kategori di atas',
    icon: HelpCircle,
    color: 'text-gray-600 dark:text-gray-400',
    bg: 'bg-gray-50 dark:bg-gray-950/20',
    border: 'border-gray-100 dark:border-gray-800',
    selectedBorder: 'border-gray-400',
    selectedBg: 'bg-gray-100 dark:bg-gray-800/60',
  },
];

export function CategoryPicker({ value, onChange, error }: CategoryPickerProps) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
        Kategori Laporan <span className="text-red-500">*</span>
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map((cat) => {
          const isSelected = value === cat.value;
          return (
            <button
              key={cat.value}
              type="button"
              onClick={() => onChange(cat.value)}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                isSelected
                  ? `${cat.selectedBg} ${cat.selectedBorder} ring-1 ring-current`
                  : `${cat.bg} ${cat.border} hover:${cat.selectedBg}`
              }`}
            >
              <cat.icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${cat.color}`} />
              <div>
                <p className={`text-sm font-semibold ${cat.color}`}>{cat.label}</p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{cat.description}</p>
              </div>
            </button>
          );
        })}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
