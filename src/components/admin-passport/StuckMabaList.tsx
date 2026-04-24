'use client';

/**
 * src/components/admin-passport/StuckMabaList.tsx
 * NAWASENA M05 — List of Maba who haven't submitted for a dimension in > 14 days.
 */

interface StuckMaba {
  userId: string;
  name: string;
  nrp: string | null;
  dimensi: string;
  daysSinceLastActivity: number;
}

interface StuckMabaListProps {
  entries: StuckMaba[];
  onNudge?: (userId: string) => void;
  isNudging?: string | null;
}

export function StuckMabaList({ entries, onNudge, isNudging }: StuckMabaListProps) {
  if (entries.length === 0) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-center">
        <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
          Tidak ada mahasiswa yang stuck.
        </p>
        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
          Semua mahasiswa aktif melakukan pengajuan.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((m) => (
        <div
          key={`${m.userId}-${m.dimensi}`}
          className="bg-white dark:bg-slate-800 rounded-xl border border-amber-100 dark:border-amber-900 p-3 flex items-center justify-between gap-3"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{m.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {m.nrp && <span>{m.nrp} · </span>}
              Dimensi: {m.dimensi}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className={`text-xs font-medium px-2 py-1 rounded-lg ${
                m.daysSinceLastActivity >= 14
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
              }`}
            >
              {m.daysSinceLastActivity}h lalu
            </span>
            {onNudge && (
              <button
                type="button"
                onClick={() => onNudge(m.userId)}
                disabled={isNudging === m.userId}
                className="text-xs px-2.5 py-1.5 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white rounded-lg transition-colors font-medium flex items-center gap-1"
              >
                {isNudging === m.userId ? (
                  <div className="h-3 w-3 border border-white border-t-transparent rounded-full animate-spin" />
                ) : null}
                Ingatkan
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
