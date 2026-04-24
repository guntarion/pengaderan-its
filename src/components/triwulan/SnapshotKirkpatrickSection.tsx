'use client';

/**
 * src/components/triwulan/SnapshotKirkpatrickSection.tsx
 * NAWASENA M14 — Displays Kirkpatrick L1-L4 evaluation summary.
 */

interface KirkpatrickLevel {
  score: number | null;
  count: number;
  partial?: boolean;
}

interface SnapshotKirkpatrickSectionProps {
  kirkpatrickData: Record<string, unknown> | null;
  className?: string;
}

const LEVEL_META = [
  {
    key: 'L1',
    label: 'Reaksi (L1)',
    description: 'NPS & kepuasan peserta',
    color: 'sky',
  },
  {
    key: 'L2',
    label: 'Pembelajaran (L2)',
    description: 'Skor rubrik & kompetensi',
    color: 'blue',
  },
  {
    key: 'L3',
    label: 'Perilaku (L3)',
    description: 'Retensi & perubahan perilaku',
    color: 'violet',
  },
  {
    key: 'L4',
    label: 'Hasil (L4)',
    description: 'Dampak institusional',
    color: 'indigo',
  },
];

function LevelBar({
  score,
  color,
  partial,
}: {
  score: number | null;
  color: string;
  partial?: boolean;
}) {
  const pct = score !== null ? Math.min(100, Math.max(0, score)) : 0;

  const barColors: Record<string, string> = {
    sky: 'bg-sky-500',
    blue: 'bg-blue-500',
    violet: 'bg-violet-500',
    indigo: 'bg-indigo-500',
  };

  return (
    <div className="mt-1.5">
      <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2">
        {score !== null ? (
          <div
            className={`${barColors[color] ?? 'bg-sky-500'} h-2 rounded-full transition-all`}
            style={{ width: `${pct}%` }}
          />
        ) : (
          <div className="h-2 rounded-full bg-gray-200 dark:bg-slate-600 w-full" />
        )}
      </div>
      {partial && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 italic">Data sebagian</p>
      )}
    </div>
  );
}

export function SnapshotKirkpatrickSection({
  kirkpatrickData,
  className = '',
}: SnapshotKirkpatrickSectionProps) {
  if (!kirkpatrickData) {
    return (
      <div className={`text-sm text-gray-400 italic ${className}`}>
        Data evaluasi Kirkpatrick tidak tersedia.
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {LEVEL_META.map(({ key, label, description, color }) => {
        const levelData = kirkpatrickData[key.toLowerCase()] as KirkpatrickLevel | null;
        const score = levelData?.score ?? null;
        const count = levelData?.count ?? 0;
        const partial = levelData?.partial ?? false;

        return (
          <div
            key={key}
            className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
              </div>
              <div className="text-right">
                {score !== null ? (
                  <p className="text-lg font-bold text-gray-800 dark:text-gray-100">
                    {score.toFixed(1)}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400">—</p>
                )}
                {count > 0 && (
                  <p className="text-xs text-gray-400">n={count}</p>
                )}
              </div>
            </div>
            <LevelBar score={score ? (score / 4) * 100 : null} color={color} partial={partial} />
          </div>
        );
      })}
    </div>
  );
}
