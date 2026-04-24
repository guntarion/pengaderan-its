/**
 * src/lib/pairing/kp-group-assignment.test.ts
 * Unit tests for KP Group assignment algorithm (3 modes).
 */

import { describe, it, expect } from 'vitest';
import { assignMabasToKPGroups } from './kp-group-assignment';
import type { KPAssignInput, KPGroupDescriptor } from './types';

function makeMaba(
  id: string,
  isRantau = false,
  isKIP = false,
  displayName?: string
): KPAssignInput {
  return { userId: id, isRantau, isKIP, displayName: displayName ?? id, nrp: `${id}000` };
}

function makeGroup(id: string, code: string): KPGroupDescriptor {
  return { id, code, capacityTarget: 12, capacityMax: 15 };
}

const THREE_GROUPS = [makeGroup('g1', 'KP-A'), makeGroup('g2', 'KP-B'), makeGroup('g3', 'KP-C')];

describe('assignMabasToKPGroups — round-robin', () => {
  it('should assign mabas to groups in round-robin order (sorted by displayName)', () => {
    const mabas = [
      makeMaba('u1', false, false, 'Charlie'),
      makeMaba('u2', false, false, 'Alice'),
      makeMaba('u3', false, false, 'Bob'),
    ];

    const result = assignMabasToKPGroups(mabas, THREE_GROUPS, { mode: 'round-robin' });

    // Sorted: Alice(u2) → KP-A, Bob(u3) → KP-B, Charlie(u1) → KP-C
    const byUser = new Map(result.assignments.map((a) => [a.userId, a.kpGroupId]));
    expect(byUser.get('u2')).toBe('g1'); // Alice → KP-A
    expect(byUser.get('u3')).toBe('g2'); // Bob → KP-B
    expect(byUser.get('u1')).toBe('g3'); // Charlie → KP-C
  });

  it('should distribute evenly across groups', () => {
    const mabas = Array.from({ length: 9 }, (_, i) => makeMaba(`u${i}`));

    const result = assignMabasToKPGroups(mabas, THREE_GROUPS, { mode: 'round-robin' });

    for (const stat of result.groupStats) {
      expect(stat.totalCount).toBe(3); // 9 / 3 groups = 3 each
    }
  });

  it('should return correct stats', () => {
    const mabas = [
      makeMaba('r1', true, false),
      makeMaba('r2', true, true),
      makeMaba('l1', false, false),
      makeMaba('l2', false, true),
    ];
    const groups = [makeGroup('g1', 'KP-A'), makeGroup('g2', 'KP-B')];

    const result = assignMabasToKPGroups(mabas, groups, { mode: 'round-robin' });

    const totalAssigned = result.groupStats.reduce((sum, s) => sum + s.totalCount, 0);
    expect(totalAssigned).toBe(4);

    const totalKIP = result.groupStats.reduce((sum, s) => sum + s.kipCount, 0);
    expect(totalKIP).toBe(2); // r2 and l2 are KIP
  });
});

describe('assignMabasToKPGroups — random-seeded', () => {
  it('should be deterministic with same seed', () => {
    const mabas = Array.from({ length: 6 }, (_, i) => makeMaba(`u${i}`));
    const opts = { mode: 'random-seeded' as const, seed: 'test-seed' };

    const r1 = assignMabasToKPGroups(mabas, THREE_GROUPS, opts);
    const r2 = assignMabasToKPGroups(mabas, THREE_GROUPS, opts);

    const ids1 = r1.assignments.map((a) => `${a.userId}:${a.kpGroupId}`).join('|');
    const ids2 = r2.assignments.map((a) => `${a.userId}:${a.kpGroupId}`).join('|');
    expect(ids1).toBe(ids2);
  });

  it('should produce different output with different seeds', () => {
    const mabas = Array.from({ length: 12 }, (_, i) => makeMaba(`u${i}`));

    const r1 = assignMabasToKPGroups(mabas, THREE_GROUPS, { mode: 'random-seeded', seed: 'seed-A' });
    const r2 = assignMabasToKPGroups(mabas, THREE_GROUPS, { mode: 'random-seeded', seed: 'seed-B' });

    const ids1 = r1.assignments.map((a) => `${a.userId}:${a.kpGroupId}`).join('|');
    const ids2 = r2.assignments.map((a) => `${a.userId}:${a.kpGroupId}`).join('|');
    expect(ids1).not.toBe(ids2);
  });
});

describe('assignMabasToKPGroups — stratified', () => {
  it('should distribute rantau/lokal and KIP evenly', () => {
    // 6 rantau (3 KIP, 3 non-KIP), 6 lokal (3 KIP, 3 non-KIP) = 12 total
    const mabas = [
      ...Array.from({ length: 3 }, (_, i) => makeMaba(`rk${i}`, true, true)),  // rantauKIP
      ...Array.from({ length: 3 }, (_, i) => makeMaba(`rn${i}`, true, false)),  // rantauNonKIP
      ...Array.from({ length: 3 }, (_, i) => makeMaba(`lk${i}`, false, true)),  // lokalKIP
      ...Array.from({ length: 3 }, (_, i) => makeMaba(`ln${i}`, false, false)), // lokalNonKIP
    ];

    const result = assignMabasToKPGroups(mabas, THREE_GROUPS, { mode: 'stratified' });

    // Each group should have 4 mabas (12 / 3)
    for (const stat of result.groupStats) {
      expect(stat.totalCount).toBe(4);
    }

    // Each group should have mix of rantau/lokal
    for (const stat of result.groupStats) {
      expect(stat.rantauCount).toBeGreaterThan(0);
      expect(stat.lokalCount).toBeGreaterThan(0);
    }
  });

  it('should assign all mabas', () => {
    const mabas = Array.from({ length: 15 }, (_, i) =>
      makeMaba(`u${i}`, i % 2 === 0, i % 3 === 0)
    );

    const result = assignMabasToKPGroups(mabas, THREE_GROUPS, { mode: 'stratified' });

    expect(result.assignments).toHaveLength(15);
    const totalStats = result.groupStats.reduce((sum, s) => sum + s.totalCount, 0);
    expect(totalStats).toBe(15);
  });
});

describe('assignMabasToKPGroups — edge cases', () => {
  it('should return empty result for empty mabas', () => {
    const result = assignMabasToKPGroups([], THREE_GROUPS, { mode: 'round-robin' });

    expect(result.assignments).toHaveLength(0);
    expect(result.metadata.inputCount).toBe(0);
  });

  it('should return empty result for empty groups', () => {
    const mabas = [makeMaba('u1')];
    const result = assignMabasToKPGroups(mabas, [], { mode: 'round-robin' });

    expect(result.assignments).toHaveLength(0);
  });

  it('should include mode in metadata', () => {
    const mabas = [makeMaba('u1')];
    const result = assignMabasToKPGroups(mabas, THREE_GROUPS, { mode: 'round-robin' });

    expect(result.metadata.mode).toBe('round-robin');
  });
});
