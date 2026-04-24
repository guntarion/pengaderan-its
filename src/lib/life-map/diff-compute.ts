/**
 * src/lib/life-map/diff-compute.ts
 * NAWASENA M07 — Side-by-side diff structure for M1/M2/M3 milestone updates.
 *
 * Computes a structured view comparing milestone progress across M1, M2, M3.
 */

type MilestoneKey = 'M1' | 'M2' | 'M3';

interface MilestoneUpdateData {
  milestone: MilestoneKey;
  progressText: string;
  progressPercent: number;
  reflectionText: string;
  recordedAt: Date | string;
  isLate: boolean;
}

export interface MilestoneDiff {
  milestone: MilestoneKey;
  data: MilestoneUpdateData | null;
  percentDelta: number | null; // relative to previous milestone
}

/**
 * Build side-by-side diff for M1/M2/M3.
 * Returns array of 3 entries (one per milestone), with percentDelta computed.
 */
export function computeMilestoneDiff(
  updates: MilestoneUpdateData[],
): MilestoneDiff[] {
  const keys: MilestoneKey[] = ['M1', 'M2', 'M3'];
  const updateMap = new Map<MilestoneKey, MilestoneUpdateData>();

  for (const u of updates) {
    updateMap.set(u.milestone, u);
  }

  const result: MilestoneDiff[] = [];
  let prevPercent: number | null = null;

  for (const key of keys) {
    const data = updateMap.get(key) ?? null;
    const currentPercent = data?.progressPercent ?? null;

    const percentDelta =
      currentPercent !== null && prevPercent !== null
        ? currentPercent - prevPercent
        : null;

    result.push({ milestone: key, data, percentDelta });

    if (currentPercent !== null) {
      prevPercent = currentPercent;
    }
  }

  return result;
}
