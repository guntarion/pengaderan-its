// src/lib/__tests__/ai-utils.test.ts
import { describe, it, expect } from 'vitest';
import { parseAIJsonResponse, toStr, buildPromptContext } from '../ai-utils';

// ============================================
// parseAIJsonResponse
// ============================================

describe('parseAIJsonResponse', () => {
  it('parses raw JSON object', () => {
    const result = parseAIJsonResponse('{"key": "value"}');
    expect(result).toEqual({ key: 'value' });
  });

  it('parses raw JSON array', () => {
    const result = parseAIJsonResponse('[1, 2, 3]');
    expect(result).toEqual([1, 2, 3]);
  });

  it('extracts JSON from markdown code block', () => {
    const input = 'Here is the result:\n```json\n{"name": "test"}\n```\nDone.';
    const result = parseAIJsonResponse(input);
    expect(result).toEqual({ name: 'test' });
  });

  it('extracts JSON from plain code block (no json tag)', () => {
    const input = '```\n{"items": [1,2]}\n```';
    const result = parseAIJsonResponse(input);
    expect(result).toEqual({ items: [1, 2] });
  });

  it('extracts JSON object from surrounding text', () => {
    const input = 'The analysis is: {"score": 85, "grade": "A"} — that is the result.';
    const result = parseAIJsonResponse(input);
    expect(result).toEqual({ score: 85, grade: 'A' });
  });

  it('extracts JSON array from surrounding text', () => {
    const input = 'Results: [{"id":1},{"id":2}] end.';
    const result = parseAIJsonResponse(input);
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('prefers object over array when object appears first', () => {
    const input = '{"items": [1,2,3]}';
    const result = parseAIJsonResponse(input);
    expect(result).toEqual({ items: [1, 2, 3] });
  });

  it('prefers array over object when array appears first', () => {
    const input = '[{"key": "val"}]';
    const result = parseAIJsonResponse(input);
    expect(result).toEqual([{ key: 'val' }]);
  });

  it('throws on unparseable content', () => {
    expect(() => parseAIJsonResponse('no json here')).toThrow();
  });

  it('handles nested objects', () => {
    const input = '```json\n{"a": {"b": {"c": 1}}}\n```';
    const result = parseAIJsonResponse(input);
    expect(result.a.b.c).toBe(1);
  });
});

// ============================================
// toStr
// ============================================

describe('toStr', () => {
  it('returns null for null', () => {
    expect(toStr(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(toStr(undefined)).toBeNull();
  });

  it('returns null for empty array', () => {
    expect(toStr([])).toBeNull();
  });

  it('returns null for empty object', () => {
    expect(toStr({})).toBeNull();
  });

  it('converts string directly', () => {
    expect(toStr('hello')).toBe('hello');
  });

  it('converts number to string', () => {
    expect(toStr(42)).toBe('42');
  });

  it('converts simple array to numbered list', () => {
    expect(toStr(['a', 'b', 'c'])).toBe('1. a\n2. b\n3. c');
  });

  it('converts object array with name/description', () => {
    const arr = [{ name: 'Item 1', description: 'Desc 1' }];
    expect(toStr(arr)).toBe('1. Item 1: Desc 1');
  });

  it('converts plain object to markdown key-value', () => {
    const obj = { key1: 'val1', key2: 'val2' };
    expect(toStr(obj)).toBe('**key1**: val1\n\n**key2**: val2');
  });
});

// ============================================
// buildPromptContext
// ============================================

describe('buildPromptContext', () => {
  it('builds context from non-empty fields', () => {
    const result = buildPromptContext({
      Name: 'Test',
      Desc: 'A description',
    });
    expect(result).toBe('Name: Test\nDesc: A description');
  });

  it('skips null and undefined fields', () => {
    const result = buildPromptContext({
      Name: 'Test',
      Missing: null,
      Empty: undefined,
    });
    expect(result).toBe('Name: Test');
  });

  it('skips empty string fields', () => {
    const result = buildPromptContext({
      Name: 'Test',
      Blank: '   ',
    });
    expect(result).toBe('Name: Test');
  });

  it('returns empty string when all fields empty', () => {
    const result = buildPromptContext({ A: null, B: undefined });
    expect(result).toBe('');
  });
});
