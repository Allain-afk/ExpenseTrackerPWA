import { describe, expect, it } from 'vitest';
import { fromSqliteTimestamp, toSqliteTimestamp } from './date';

describe('date utilities', () => {
  it('serializes dates to the Flutter-compatible sqlite timestamp format', () => {
    const value = new Date(2026, 2, 29, 14, 5, 9);
    expect(toSqliteTimestamp(value)).toBe('2026-03-29 14:05:09');
  });

  it('parses sqlite timestamps back into local dates', () => {
    const value = fromSqliteTimestamp('2026-03-29 14:05:09');
    expect(value.getFullYear()).toBe(2026);
    expect(value.getMonth()).toBe(2);
    expect(value.getDate()).toBe(29);
    expect(value.getHours()).toBe(14);
    expect(value.getMinutes()).toBe(5);
    expect(value.getSeconds()).toBe(9);
  });
});
