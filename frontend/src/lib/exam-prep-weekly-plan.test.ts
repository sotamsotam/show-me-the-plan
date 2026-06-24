import { describe, expect, it } from 'vitest';

import { createDefaultExamPrepWeeksByRound } from './exam-countdown';
import {
  areExamPrepWeeklyPlansEqual,
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

describe('areExamPrepWeeklyPlansEqual', () => {
  it('treats normalized plans as equal', () => {
    const left = resolveExamPrepWeeklyPlans({
      'sem1-r2': { weeks: { '4': { korean: '  1회독  ' } } },
    });
    const right = resolveExamPrepWeeklyPlans({
      'sem1-r2': { weeks: { '4': { korean: '1회독' } } },
    });

    expect(areExamPrepWeeklyPlansEqual(left, right)).toBe(true);
  });

  it('detects changed content', () => {
    const left = resolveExamPrepWeeklyPlans({
      'sem1-r2': { weeks: { '4': { korean: '1회독' } } },
    });
    const right = resolveExamPrepWeeklyPlans({
      'sem1-r2': { weeks: { '4': { korean: '2회독' } } },
    });

    expect(areExamPrepWeeklyPlansEqual(left, right)).toBe(false);
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
