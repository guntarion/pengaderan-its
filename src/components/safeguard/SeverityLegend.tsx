'use client';

/**
 * src/components/safeguard/SeverityLegend.tsx
 * NAWASENA M10 — Educational tooltip/legend for severity levels.
 */

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

const SEVERITY_INFO = [
  {
    level: 'KRITIS (RED)',
    color: 'bg-red-500',
    description:
      'Insiden yang mengancam keselamatan fisik/psikis segera, atau penggunaan SAFE WORD. Eskalasi WAJIB dalam 30 menit.',
  },
  {
    level: 'SEDANG (YELLOW)',
    color: 'bg-amber-500',
    description:
      'Insiden yang memerlukan perhatian dan tindak lanjut dalam 24 jam, namun tidak mengancam keselamatan segera.',
  },
  {
    level: 'RINGAN (GREEN)',
    color: 'bg-emerald-500',
    description:
      'Insiden minor yang dapat diselesaikan oleh KP/SC tanpa eskalasi darurat.',
  },
] as const;

interface SeverityLegendProps {
  className?: string;
}

export function SeverityLegend({ className }: SeverityLegendProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 ${className ?? ''}`}
            aria-label="Keterangan tingkat keparahan insiden"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Keterangan Tingkat
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="w-72 p-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              Tingkat Keparahan Insiden
            </p>
            {SEVERITY_INFO.map((item) => (
              <div key={item.level} className="flex items-start gap-2">
                <div className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${item.color}`} />
                <div>
                  <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                    {item.level}
                  </span>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
