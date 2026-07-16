import { describe, expect, it } from 'vitest';

import { parseScheduleCategoryQuery } from './user-schedule';

describe('parseScheduleCategoryQuery', () => {
  it('treats missing values as no filter', () => {
    expect(parseScheduleCategoryQuery(undefined)).toEqual({
      ok: true,
      category: null,
    });
    expect(parseScheduleCategoryQuery(null)).toEqual({
      ok: true,
      category: null,
    });
    expect(parseScheduleCategoryQuery('')).toEqual({
      ok: true,
      category: null,
    });
  });

  it('accepts known schedule categories', () => {
    expect(parseScheduleCategoryQuery('performance')).toEqual({
      ok: true,
      category: 'performance',
    });
    expect(parseScheduleCategoryQuery('academy')).toEqual({
      ok: true,
      category: 'academy',
    });
  });

  it('rejects unknown schedule categories', () => {
    expect(parseScheduleCategoryQuery('unknown')).toEqual({
      ok: false,
      error:
        'scheduleCategory는 managed, academy, fixed, other, performance 중 하나여야 합니다.',
    });
  });
});
