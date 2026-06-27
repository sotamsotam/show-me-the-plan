import { describe, expect, it } from 'vitest';

import { createDefaultExamPrepWeeksByRound } from './exam-countdown';
import {
  clearExamPrepWeeklyPlanScheduledTodoIdByTodoId,
  createEmptyExamPrepWeeklyPlans,
  createExamPrepWeeklyPlanItem,
  getExamPrepWeeklyPlanItems,
  getUnscheduledExamPrepWeeklyPlanItemsForCell,
  MAX_EXAM_PREP_WEEKLY_PLAN_ITEM_TITLE_LENGTH,
  resolveExamPrepWeeklyPlans,
  validateExamPrepWeeklyPlansInput,
  writeExamPrepWeeklyPlanItemsForCell,
} from './exam-prep-weekly-plan';

const allowedSubjectIds = new Set(['korean', 'english', 'math']);
const examPrepWeeksByRound = createDefaultExamPrepWeeksByRound(4);

describe('resolveExamPrepWeeklyPlans', () => {
  it('returns an empty object for missing or invalid values', () => {
    expect(resolveExamPrepWeeklyPlans(null)).toEqual({});
    expect(resolveExamPrepWeeklyPlans([])).toEqual({});
    expect(resolveExamPrepWeeklyPlans('invalid')).toEqual({});
  });

  it('normalizes nested weeks and trims item titles', () => {
    expect(
      resolveExamPrepWeeklyPlans({
        'sem1-r2': {
          weeks: {
            '4': {
              korean: [{ id: 'item-1', title: '  교과서 1-3단원  ' }],
            },
            '1': {
              math: [{ id: 'item-3', title: '기출 정리' }],
            },
          },
        },
      })
    ).toEqual({
      'sem1-r2': {
        weeks: {
          '4': {
            korean: [{ id: 'item-1', title: '교과서 1-3단원' }],
          },
          '1': {
            math: [{ id: 'item-3', title: '기출 정리' }],
          },
        },
      },
    });
  });

  it('ignores legacy string cells and unknown round slots', () => {
    expect(
      resolveExamPrepWeeklyPlans({
        'invalid-slot': {
          weeks: {
            '1': { korean: '무시' },
          },
        },
        'sem1-r2': {
          weeks: {
            '4': { korean: 'legacy text' },
          },
        },
        'sem2-r1': {
          weeks: {
            '0': { korean: [{ id: 'a', title: '무시' }] },
            '13': { korean: [{ id: 'b', title: '무시' }] },
            '2': { english: [{ id: 'c', title: '유지' }] },
          },
        },
      })
    ).toEqual({
      'sem2-r1': {
        weeks: {
          '2': {
            english: [{ id: 'c', title: '유지' }],
          },
        },
      },
    });
  });
});

describe('validateExamPrepWeeklyPlansInput', () => {
  it('accepts valid plans for configured weeks and subjects', () => {
    expect(
      validateExamPrepWeeklyPlansInput(
        {
          'sem1-r2': {
            weeks: {
              '4': { korean: [{ id: 'a', title: '1회독' }] },
              '1': { english: [{ id: 'b', title: '단어 암기' }] },
            },
          },
        },
        { allowedSubjectIds, examPrepWeeksByRound }
      )
    ).toEqual({
      plans: {
        'sem1-r2': {
          weeks: {
            '4': { korean: [{ id: 'a', title: '1회독' }] },
            '1': { english: [{ id: 'b', title: '단어 암기' }] },
          },
        },
      },
    });
  });

  it('rejects week numbers above the configured prep weeks', () => {
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

  it('rejects unknown subjects and overly long item titles', () => {
    expect(
      validateExamPrepWeeklyPlansInput(
        {
          'sem1-r2': {
            weeks: {
              '2': { unknown: [{ id: 'a', title: '내용' }] },
            },
          },
        },
        { allowedSubjectIds, examPrepWeeksByRound }
      )
    ).toEqual({
      error: '등록되지 않은 과목입니다: unknown',
    });

    expect(
      validateExamPrepWeeklyPlansInput(
        {
          'sem1-r2': {
            weeks: {
              '2': {
                korean: [
                  {
                    id: 'a',
                    title: 'a'.repeat(MAX_EXAM_PREP_WEEKLY_PLAN_ITEM_TITLE_LENGTH + 1),
                  },
                ],
              },
            },
          },
        },
        { allowedSubjectIds, examPrepWeeksByRound }
      )
    ).toEqual({
      error: `항목 제목은 ${MAX_EXAM_PREP_WEEKLY_PLAN_ITEM_TITLE_LENGTH}자 이하여야 합니다.`,
    });
  });
});

describe('getExamPrepWeeklyPlanItems', () => {
  it('returns stored items for a round, week, and subject', () => {
    const plans = resolveExamPrepWeeklyPlans({
      'sem1-r2': {
        weeks: {
          '3': { math: [{ id: 'item-1', title: '오답노트' }] },
        },
      },
    });

    expect(getExamPrepWeeklyPlanItems(plans, 'sem1-r2', 3, 'math')).toEqual([
      { id: 'item-1', title: '오답노트' },
    ]);
    expect(getExamPrepWeeklyPlanItems(plans, 'sem1-r2', 4, 'math')).toEqual([]);
    expect(createEmptyExamPrepWeeklyPlans()).toEqual({});
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
