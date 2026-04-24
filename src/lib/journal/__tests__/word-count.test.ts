/**
 * src/lib/journal/__tests__/word-count.test.ts
 * Unit tests for countWords utility.
 */

import { describe, it, expect } from 'vitest';
import { countWords } from '../word-count';

describe('countWords', () => {
  it('returns 0 for empty string', () => {
    expect(countWords('')).toBe(0);
  });

  it('counts two words', () => {
    expect(countWords('hello world')).toBe(2);
  });

  it('handles multiple spaces between words', () => {
    expect(countWords('  multiple   spaces  ')).toBe(2);
  });

  it('counts single word', () => {
    expect(countWords('one')).toBe(1);
  });

  it('handles unicode/emoji without breaking count', () => {
    // emoji surrounded by text — emoji counts as one "word"
    expect(countWords('hello 😊 world')).toBe(3);
  });

  it('returns 0 for whitespace-only string', () => {
    expect(countWords('   \t\n  ')).toBe(0);
  });

  it('handles newlines as separators', () => {
    expect(countWords('line one\nline two')).toBe(4);
  });

  it('handles tabs as separators', () => {
    expect(countWords('word1\tword2')).toBe(2);
  });
});
