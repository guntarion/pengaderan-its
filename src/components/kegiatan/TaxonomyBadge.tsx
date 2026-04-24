/**
 * src/components/kegiatan/TaxonomyBadge.tsx
 * Compact badge for taxonomy labels (nilai, dimensi, fase, kategori, etc.)
 * Shows bilingual label from TaxonomyMeta with tooltip.
 */

'use client';

import React from 'react';

type TaxonomyBadgeVariant = 'nilai' | 'dimensi' | 'fase' | 'kategori' | 'intensity' | 'scale' | 'default';

interface TaxonomyBadgeProps {
  value: string;
  variant?: TaxonomyBadgeVariant;
  label?: string; // override display text (from TaxonomyMeta.labelId)
  tooltip?: string; // override tooltip (from TaxonomyMeta.deskripsi)
  size?: 'sm' | 'xs';
}

const VARIANT_STYLES: Record<TaxonomyBadgeVariant, string> = {
  nilai:
    'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800',
  dimensi:
    'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  fase: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800',
  kategori:
    'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  intensity:
    'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  scale:
    'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800',
  default:
    'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600',
};

/**
 * Format raw enum value as human-readable label.
 * Used as fallback when no TaxonomyMeta label is provided.
 */
function formatEnumLabel(value: string): string {
  return value
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function TaxonomyBadge({
  value,
  variant = 'default',
  label,
  tooltip,
  size = 'xs',
}: TaxonomyBadgeProps) {
  const displayLabel = label ?? formatEnumLabel(value);
  const sizeClasses = size === 'sm' ? 'text-sm px-3 py-1' : 'text-xs px-2 py-0.5';

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${sizeClasses} ${VARIANT_STYLES[variant]}`}
      title={tooltip ?? displayLabel}
    >
      {displayLabel}
    </span>
  );
}
