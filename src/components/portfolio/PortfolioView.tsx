'use client';

/**
 * src/components/portfolio/PortfolioView.tsx
 * NAWASENA M07 — Main Portfolio view layout.
 *
 * Composes TimeCapsule, LifeMap, and Passport sections.
 * Includes print CSS and disabled PDF export button.
 */

import { PortfolioTimeCapsuleSection } from './PortfolioTimeCapsuleSection';
import { PortfolioLifeMapSection } from './PortfolioLifeMapSection';
import { PortfolioPassportSection } from './PortfolioPassportSection';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PrinterIcon, DownloadIcon } from 'lucide-react';
import type { PortfolioData } from '@/lib/portfolio/composer';

interface PortfolioViewProps {
  data: PortfolioData;
  readonly?: boolean;
}

export function PortfolioView({ data, readonly = false }: PortfolioViewProps) {
  return (
    <div className="space-y-6 print:space-y-4">
      {/* Action bar */}
      <div className="flex justify-end gap-2 print:hidden">
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl gap-1.5"
          onClick={() => window.print()}
        >
          <PrinterIcon className="h-4 w-4" />
          Print
        </Button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-1.5"
                  disabled
                >
                  <DownloadIcon className="h-4 w-4" />
                  Export PDF
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Fitur export PDF akan tersedia pada update berikutnya</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Time Capsule section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm">
        <PortfolioTimeCapsuleSection
          totalEntries={data.timeCapsule.totalEntries}
          sharedEntries={data.timeCapsule.sharedEntries}
          recentEntries={data.timeCapsule.recentEntries}
          readonly={readonly}
        />
      </div>

      {/* Life Map section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm">
        <PortfolioLifeMapSection
          totalGoals={data.lifeMap.totalGoals}
          activeGoals={data.lifeMap.activeGoals}
          achievedGoals={data.lifeMap.achievedGoals}
          byArea={data.lifeMap.byArea as Parameters<typeof PortfolioLifeMapSection>[0]['byArea']}
          readonly={readonly}
        />
      </div>

      {/* Passport section (optional) */}
      {data.passport && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-sky-100 dark:border-sky-900 p-5 shadow-sm">
          <PortfolioPassportSection
            completedBadges={data.passport.completedBadges}
            totalBadges={data.passport.totalBadges}
          />
        </div>
      )}

      {/* Print-only styles */}
      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .rounded-2xl { border-radius: 0 !important; }
        }
      `}</style>
    </div>
  );
}
