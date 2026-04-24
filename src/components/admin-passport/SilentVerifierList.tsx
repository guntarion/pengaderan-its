'use client';

/**
 * src/components/admin-passport/SilentVerifierList.tsx
 * NAWASENA M05 — Verifiers with large pending queues who haven't acted recently.
 */

interface SilentVerifier {
  userId: string;
  name: string;
  role: string;
  pendingCount: number;
  oldestPendingDays: number;
}

interface SilentVerifierListProps {
  verifiers: SilentVerifier[];
  onNudge?: (userId: string) => void;
  isNudging?: string | null;
}

export function SilentVerifierList({ verifiers, onNudge, isNudging }: SilentVerifierListProps) {
  if (verifiers.length === 0) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-center">
        <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
          Semua verifikator aktif.
        </p>
        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
          Tidak ada antrian yang menumpuk.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {verifiers.map((v) => (
        <div
          key={v.userId}
          className="bg-white dark:bg-slate-800 rounded-xl border border-red-100 dark:border-red-900 p-3 flex items-center justify-between gap-3"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{v.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {v.role} · {v.pendingCount} antrian · tertua {v.oldestPendingDays}h
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-medium px-2 py-1 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {v.pendingCount} pending
            </span>
            {onNudge && (
              <button
                type="button"
                onClick={() => onNudge(v.userId)}
                disabled={isNudging === v.userId}
                className="text-xs px-2.5 py-1.5 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white rounded-lg transition-colors font-medium flex items-center gap-1"
              >
                {isNudging === v.userId ? (
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
