import { describe, expect, it } from 'vitest';

import { getMonthRange } from './user-schedule';

describe('getMonthRange', () => {
  it('returns [start, end) bounds for the calendar month', () => {
    expect(getMonthRange('2026-06-15')).toEqual({
      start: '2026-06-01',
      end: '2026-07-01',
    });
    expect(getMonthRange('2026-06-30')).toEqual({
      start: '2026-06-01',
      end: '2026-07-01',
    });
  });

  it('handles month and year boundaries', () => {
    expect(getMonthRange('2026-01-31')).toEqual({
      start: '2026-01-01',
      end: '2026-02-01',
    });
    expect(getMonthRange('2026-12-15')).toEqual({
      start: '2026-12-01',
      end: '2027-01-01',
    });
    expect(getMonthRange('2024-02-29')).toEqual({
      start: '2024-02-01',
      end: '2024-03-01',
    });
  });
});
