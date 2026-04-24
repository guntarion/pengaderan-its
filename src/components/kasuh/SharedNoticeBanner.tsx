'use client';

/**
 * src/components/kasuh/SharedNoticeBanner.tsx
 * NAWASENA M07 — Notice banner shown to Kasuh when viewing shared content.
 */

import { InfoIcon } from 'lucide-react';

export function SharedNoticeBanner({ mabaName }: { mabaName: string }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-xl text-sm text-sky-700 dark:text-sky-400">
      <InfoIcon className="h-4 w-4 mt-0.5 shrink-0" />
      <p>
        Kamu sedang melihat catatan yang <strong>sengaja dibagikan</strong> oleh{' '}
        <strong>{mabaName}</strong> kepadamu. Hormati privasi adik asuhmu.
      </p>
    </div>
  );
}
