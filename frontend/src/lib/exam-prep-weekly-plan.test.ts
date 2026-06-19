import { describe, expect, it } from 'vitest';

import { createDefaultExamPrepWeeksByRound } from './exam-countdown';
import {
  resolveExamPrepWeeklyPlans,
  validateExamPrepWeeklyPlansInput,
} from './exam-prep-weekly-plan';

const allowedSubjectIds = new Set(['korean', 'english']);
const examPrepWeeksByRound = createDefaultExamPrepWeeksByRound(4);

describe('resolveExamPrepWeeklyPlans', () => {
  it('normalizes stored weekly plans', () => {
    expect(
      resolveExamPrepWeeklyPlans({
        'sem1-r2': {
          weeks: {
            '4': { korean: '  1회독  ' },
          },
        },
      })
    ).toEqual({
      'sem1-r2': {
        weeks: {
          '4': { korean: '1회독' },
        },
      },
    });
  });
});

describe('validateExamPrepWeeklyPlansInput', () => {
  it('rejects week numbers above configured prep weeks', () => {
    expect(
      validateExamPrepWeeklyPlansInput(
        {
          'sem1-r2': {
            weeks: {
              '5': { korean: '범위 초과' },
            },
          },
        },
        { allowedSubjectIds, examPrepWeeksByRound }
      )
    ).toEqual({
      error: 'sem1-r2 회차는 1~4주차까지만 입력할 수 있습니다.',
    });
  });
});
