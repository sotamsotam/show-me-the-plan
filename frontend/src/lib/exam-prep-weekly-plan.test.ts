import { describe, expect, it } from 'vitest';

import { createDefaultExamPrepWeeksByRound } from './exam-countdown';
import {
  appendExamPrepWeeklyPlanItemsFromTitles,
  areExamPrepWeeklyPlansEqual,
  clearExamPrepWeeklyPlanScheduledTodoIdByTodoId,
  createExamPrepWeeklyPlanItem,
  getUnscheduledExamPrepWeeklyPlanItemsForCell,
  parseWeeklyPlanItemTitlesFromMultilineText,
  reorderExamPrepWeeklyPlanItems,
  resolveExamPrepWeeklyPlans,
  validateExamPrepWeeklyPlansInput,
  writeExamPrepWeeklyPlanItemsForCell,
} from './exam-prep-weekly-plan';

const allowedSubjectIds = new Set(['korean', 'english']);
const examPrepWeeksByRound = createDefaultExamPrepWeeksByRound(4);

describe('resolveExamPrepWeeklyPlans', () => {
  it('normalizes stored weekly plan items', () => {
    expect(
      resolveExamPrepWeeklyPlans({
        'sem1-r2': {
          weeks: {
            '4': {
              korean: [{ id: 'item-1', title: '  1회독  ' }],
            },
          },
        },
      })
    ).toEqual({
      'sem1-r2': {
        weeks: {
          '4': {
            korean: [{ id: 'item-1', title: '1회독' }],
          },
        },
      },
    });
  });

  it('ignores legacy string cells', () => {
    expect(
      resolveExamPrepWeeklyPlans({
        'sem1-r2': {
          weeks: {
            '4': { korean: 'legacy text' },
          },
        },
      })
    ).toEqual({});
  });
});

describe('writeExamPrepWeeklyPlanItemsForCell', () => {
  it('preserves scheduled items when updating unscheduled items', () => {
    const plans = resolveExamPrepWeeklyPlans({
      'sem1-r2': {
        weeks: {
          '4': {
            korean: [
              { id: 'scheduled', title: '배치됨', scheduledTodoId: 10 },
              { id: 'pending', title: '대기' },
            ],
          },
        },
      },
    });

    const next = writeExamPrepWeeklyPlanItemsForCell(
      plans,
      'sem1-r2',
      4,
      'korean',
      [createExamPrepWeeklyPlanItem('새 항목', 'new-item')]
    );

    expect(getUnscheduledExamPrepWeeklyPlanItemsForCell(next, 'sem1-r2', 4, 'korean')).toEqual([
      { id: 'new-item', title: '새 항목' },
    ]);
    expect(next['sem1-r2']?.weeks?.['4']?.korean).toEqual([
      { id: 'scheduled', title: '배치됨', scheduledTodoId: 10 },
      { id: 'new-item', title: '새 항목' },
    ]);
  });
});

describe('clearExamPrepWeeklyPlanScheduledTodoIdByTodoId', () => {
  it('clears scheduledTodoId from matching items across weeks', () => {
    const plans = resolveExamPrepWeeklyPlans({
      'sem1-r2': {
        weeks: {
          '4': {
            korean: [{ id: 'scheduled', title: '배치됨', scheduledTodoId: 10 }],
          },
        },
      },
    });

    const next = clearExamPrepWeeklyPlanScheduledTodoIdByTodoId(plans, 10);

    expect(getUnscheduledExamPrepWeeklyPlanItemsForCell(next, 'sem1-r2', 4, 'korean')).toEqual([
      { id: 'scheduled', title: '배치됨' },
    ]);
  });
});

describe('areExamPrepWeeklyPlansEqual', () => {
  it('treats normalized plans as equal', () => {
    const left = resolveExamPrepWeeklyPlans({
      'sem1-r2': { weeks: { '4': { korean: [{ id: 'a', title: '  1회독  ' }] } } },
    });
    const right = resolveExamPrepWeeklyPlans({
      'sem1-r2': { weeks: { '4': { korean: [{ id: 'a', title: '1회독' }] } } },
    });

    expect(areExamPrepWeeklyPlansEqual(left, right)).toBe(true);
  });

  it('detects changed content', () => {
    const left = resolveExamPrepWeeklyPlans({
      'sem1-r2': { weeks: { '4': { korean: [{ id: 'a', title: '1회독' }] } } },
    });
    const right = resolveExamPrepWeeklyPlans({
      'sem1-r2': { weeks: { '4': { korean: [{ id: 'a', title: '2회독' }] } } },
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
              '5': { korean: [{ id: 'a', title: '범위 초과' }] },
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

describe('parseWeeklyPlanItemTitlesFromMultilineText', () => {
  it('splits pasted lines into titles', () => {
    expect(parseWeeklyPlanItemTitlesFromMultilineText('1회독\r\n2회독\n\n  3회독  ')).toEqual([
      '1회독',
      '2회독',
      '3회독',
    ]);
  });
});

describe('appendExamPrepWeeklyPlanItemsFromTitles', () => {
  it('appends multiple titles and enforces cell capacity', () => {
    const existing = [createExamPrepWeeklyPlanItem('기존')];
    const result = appendExamPrepWeeklyPlanItemsFromTitles(existing, ['A', 'B']);

    expect(result).toEqual({
      items: [
        existing[0],
        expect.objectContaining({ title: 'A' }),
        expect.objectContaining({ title: 'B' }),
      ],
    });
  });
});

describe('reorderExamPrepWeeklyPlanItems', () => {
  it('moves an item to a new index', () => {
    const items = [
      createExamPrepWeeklyPlanItem('A', 'a'),
      createExamPrepWeeklyPlanItem('B', 'b'),
      createExamPrepWeeklyPlanItem('C', 'c'),
    ];

    expect(reorderExamPrepWeeklyPlanItems(items, 0, 2).map((item) => item.id)).toEqual([
      'b',
      'c',
      'a',
    ]);
  });
});
