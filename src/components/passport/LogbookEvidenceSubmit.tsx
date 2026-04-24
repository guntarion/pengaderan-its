'use client';

/**
 * src/components/passport/LogbookEvidenceSubmit.tsx
 * NAWASENA M05 — Logbook (M04 Journal) evidence submission stub.
 *
 * M04 Journal module integration is deferred. Shows coming-soon state.
 */

interface LogbookEvidenceSubmitProps {
  itemId: string;
  itemName: string;
  previousEntryId?: string | null;
}

export function LogbookEvidenceSubmit({ itemName }: LogbookEvidenceSubmitProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-700 space-y-3">
      <span className="text-4xl">📓</span>
      <div className="text-center">
        <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
          Bukti Logbook — Segera Hadir
        </p>
        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 max-w-xs">
          Fitur ini terhubung dengan Modul Journal (M04) yang sedang dalam pengembangan.
          Hubungi panitia untuk informasi lebih lanjut.
        </p>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">Item: {itemName}</p>
    </div>
  );
}
