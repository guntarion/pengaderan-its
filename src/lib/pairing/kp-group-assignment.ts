/**
 * src/lib/pairing/kp-group-assignment.ts
 * KP Group Assignment algorithm — 3 modes: round-robin, random-seeded, stratified.
 *
 * Modes:
 * - round-robin: sort by NRP/displayName, assign groups 1,2,...,N,1,2,...
 * - random-seeded: seeded shuffle, then round-robin
 * - stratified: split by isRantau+isKIP, distribute strata round-robin per group
 *
 * Returns: mapping maba→kpGroup + stats per group.
 */

import { createLogger } from '@/lib/logger';
import type {
  KPAssignInput,
  KPGroupDescriptor,
  KPGroupAssignment,
  KPGroupStats,
  KPGroupAssignResult,
  KPAssignOptions,
} from './types';

const log = createLogger('kp-group-assignment');

// ============================================================
// Mulberry32 PRNG (same inline impl as buddy-algorithm)
// ============================================================

function mulberry32(seedStr: string): () => number {
  let h = 0x12345678;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 0x9e3779b9);
    h ^= h >>> 16;
  }
  let state = h >>> 0;
  return function () {
    state = (state + 0x6d2b79f5) >>> 0;
    let z = state;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithSeed<T>(arr: T[], rng: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function hashInputIds(userIds: string[]): string {
  const sorted = [...userIds].sort();
  let hash = 2166136261;
  const str = sorted.join(',');
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

// ============================================================
// Build group stats after assignment
// ============================================================

function buildGroupStats(
  mabas: KPAssignInput[],
  groups: KPGroupDescriptor[],
  assignments: KPGroupAssignment[]
): KPGroupStats[] {
  const groupMap = new Map<string, KPGroupDescriptor>(groups.map((g) => [g.id, g]));
  const mabaMap = new Map<string, KPAssignInput>(mabas.map((m) => [m.userId, m]));

  const statsMap = new Map<string, KPGroupStats>();
  for (const group of groups) {
    statsMap.set(group.id, {
      kpGroupId: group.id,
      code: group.code,
      totalCount: 0,
      rantauCount: 0,
      lokalCount: 0,
      kipCount: 0,
    });
  }

  for (const assign of assignments) {
    const maba = mabaMap.get(assign.userId);
    const stats = statsMap.get(assign.kpGroupId);
    if (!maba || !stats) continue;

    stats.totalCount++;
    if (maba.isRantau) {
      stats.rantauCount++;
    } else {
      stats.lokalCount++;
    }
    if (maba.isKIP) stats.kipCount++;
  }

  // Suppress unused warning
  void groupMap;

  return Array.from(statsMap.values());
}

// ============================================================
// Round-robin assignment (sorted input)
// ============================================================

function assignRoundRobin(
  sortedMabas: KPAssignInput[],
  groups: KPGroupDescriptor[]
): KPGroupAssignment[] {
  return sortedMabas.map((maba, idx) => ({
    userId: maba.userId,
    kpGroupId: groups[idx % groups.length].id,
  }));
}

// ============================================================
// Main export: assignMabasToKPGroups
// ============================================================

export function assignMabasToKPGroups(
  mabas: KPAssignInput[],
  kpGroups: KPGroupDescriptor[],
  options: KPAssignOptions
): KPGroupAssignResult {
  const { mode, seed } = options;

  log.info('Starting KP Group assignment', {
    mode,
    mabaCount: mabas.length,
    groupCount: kpGroups.length,
    seed,
  });

  if (mabas.length === 0 || kpGroups.length === 0) {
    log.warn('Empty mabas or groups — returning empty result');
    return {
      assignments: [],
      groupStats: kpGroups.map((g) => ({
        kpGroupId: g.id,
        code: g.code,
        totalCount: 0,
        rantauCount: 0,
        lokalCount: 0,
        kipCount: 0,
      })),
      metadata: {
        mode,
        seed,
        inputCount: mabas.length,
        groupCount: kpGroups.length,
        inputHash: hashInputIds([]),
      },
    };
  }

  const inputHash = hashInputIds(mabas.map((m) => m.userId));
  let assignments: KPGroupAssignment[] = [];

  if (mode === 'round-robin') {
    // Sort alphabetically by displayName, then NRP
    const sorted = [...mabas].sort((a, b) => {
      const nameCompare = a.displayName.localeCompare(b.displayName);
      if (nameCompare !== 0) return nameCompare;
      return (a.nrp ?? '').localeCompare(b.nrp ?? '');
    });
    assignments = assignRoundRobin(sorted, kpGroups);

  } else if (mode === 'random-seeded') {
    if (!seed) {
      log.warn('random-seeded mode requires a seed — using default');
    }
    const rng = mulberry32(seed ?? 'default-seed');
    const shuffled = shuffleWithSeed(mabas, rng);
    assignments = assignRoundRobin(shuffled, kpGroups);

  } else if (mode === 'stratified') {
    // Split into 4 strata: rantau+KIP, rantau+non-KIP, lokal+KIP, lokal+non-KIP
    const strata = {
      rantauKIP: mabas.filter((m) => m.isRantau && m.isKIP),
      rantauNonKIP: mabas.filter((m) => m.isRantau && !m.isKIP),
      lokalKIP: mabas.filter((m) => !m.isRantau && m.isKIP),
      lokalNonKIP: mabas.filter((m) => !m.isRantau && !m.isKIP),
    };

    log.debug('Strata distribution', {
      rantauKIP: strata.rantauKIP.length,
      rantauNonKIP: strata.rantauNonKIP.length,
      lokalKIP: strata.lokalKIP.length,
      lokalNonKIP: strata.lokalNonKIP.length,
    });

    // Interleave strata round-robin to distribute evenly
    // Order: rantauNonKIP, lokalNonKIP, rantauKIP, lokalKIP
    const interleaved: KPAssignInput[] = [];
    const stratumOrder = [strata.rantauNonKIP, strata.lokalNonKIP, strata.rantauKIP, strata.lokalKIP];
    const maxLen = Math.max(...stratumOrder.map((s) => s.length));

    for (let i = 0; i < maxLen; i++) {
      for (const stratum of stratumOrder) {
        if (i < stratum.length) {
          interleaved.push(stratum[i]);
        }
      }
    }

    assignments = assignRoundRobin(interleaved, kpGroups);
  }

  const groupStats = buildGroupStats(mabas, kpGroups, assignments);

  log.info('KP Group assignment complete', {
    mode,
    assignmentCount: assignments.length,
    groupCount: kpGroups.length,
  });

  return {
    assignments,
    groupStats,
    metadata: {
      mode,
      seed,
      inputCount: mabas.length,
      groupCount: kpGroups.length,
      inputHash,
    },
  };
}
