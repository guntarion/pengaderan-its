/**
 * src/lib/pairing/constraints.ts
 * Negative constraints for pairing — V1 stub.
 *
 * V1: In-memory conflict list. Removes pairs where both users appear in a conflict entry.
 * V2 (deferred): Query `PairingConflict` table for persisted constraints.
 */

import { createLogger } from '@/lib/logger';
import type { BuddyPairResult } from './types';

const log = createLogger('pairing-constraints');

export interface ConflictEntry {
  userAId: string;
  userBId: string;
  reason?: string;
}

/**
 * Apply negative constraints — remove pairs where both users appear in conflict list.
 * Returns filtered pairs + list of removed pairs.
 *
 * V1: Simple O(n × m) scan. For N≤300 and M≤10 conflicts, this is fine.
 */
export function applyNegativeConstraints(
  pairs: BuddyPairResult[],
  conflictList: ConflictEntry[]
): { filtered: BuddyPairResult[]; removed: BuddyPairResult[] } {
  if (conflictList.length === 0) {
    log.debug('No constraints to apply');
    return { filtered: pairs, removed: [] };
  }

  // Build conflict set for O(1) lookup
  const conflictSet = new Set<string>();
  for (const conflict of conflictList) {
    const key1 = `${conflict.userAId}:${conflict.userBId}`;
    const key2 = `${conflict.userBId}:${conflict.userAId}`;
    conflictSet.add(key1);
    conflictSet.add(key2);
  }

  const filtered: BuddyPairResult[] = [];
  const removed: BuddyPairResult[] = [];

  for (const pair of pairs) {
    const key = `${pair.userAId}:${pair.userBId}`;
    const keyReverse = `${pair.userBId}:${pair.userAId}`;
    const isConflict = conflictSet.has(key) || conflictSet.has(keyReverse);

    if (isConflict) {
      log.debug('Removing conflicted pair', { userAId: pair.userAId, userBId: pair.userBId });
      removed.push(pair);
    } else {
      filtered.push(pair);
    }
  }

  if (removed.length > 0) {
    log.info('Applied negative constraints', {
      totalPairs: pairs.length,
      filteredPairs: filtered.length,
      removedPairs: removed.length,
    });
  }

  return { filtered, removed };
}
