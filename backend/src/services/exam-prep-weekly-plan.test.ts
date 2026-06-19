import { describe, expect, it } from 'vitest';

import { createDefaultExamPrepWeeksByRound } from './exam-countdown';
import {
  createEmptyExamPrepWeeklyPlans,
  getExamPrepWeeklyPlanContent,
  MAX_EXAM_PREP_WEEKLY_PLAN_CONTENT_LENGTH,
  resolveExamPrepWeeklyPlans,
  validateExamPrepWeeklyPlansInput,
} from './exam-prep-weekly-plan';

const allowedSubjectIds = new Set(['korean', 'english', 'math']);
const examPrepWeeksByRound = createDefaultExamPrepWeeksByRound(4);

describe('resolveExamPrepWeeklyPlans', () => {
  it('returns an empty object for missing or invalid values', () => {
    expect(resolveExamPrepWeeklyPlans(null)).toEqual({});
    expect(resolveExamPrepWeeklyPlans([])).toEqual({});
    expect(resolveExamPrepWeeklyPlans('invalid')).toEqual({});
  });

  it('normalizes nested weeks and trims empty content', () => {
    expect(
      resolveExamPrepWeeklyPlans({
        'sem1-r2': {
          weeks: {
            '4': {
              korean: '  교과서 1-3단원  ',
              english: '   ',
            },
            '1': {
              math: '기출 정리',
            },
          },
        },
      })
    ).toEqual({
      'sem1-r2': {
        weeks: {
          '4': {
            korean: '교과서 1-3단원',
          },
          '1': {
            math: '기출 정리',
          },
        },
      },
    });
  });

  it('ignores unknown round slots and invalid week numbers', () => {
    expect(
      resolveExamPrepWeeklyPlans({
        'invalid-slot': {
          weeks: {
            '1': { korean: '무시' },
          },
        },
        'sem2-r1': {
          weeks: {
            '0': { korean: '무시' },
            '13': { korean: '무시' },
            '2': { english: '유지' },
          },
        },
      })
    ).toEqual({
      'sem2-r1': {
        weeks: {
          '2': {
            english: '유지',
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
              '4': { korean: '1회독' },
              '1': { english: '단어 암기' },
            },
          },
        },
        { allowedSubjectIds, examPrepWeeksByRound }
      )
    ).toEqual({
      plans: {
        'sem1-r2': {
          weeks: {
            '4': { korean: '1회독' },
            '1': { english: '단어 암기' },
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

  it('rejects unknown subjects and overly long content', () => {
    expect(
      validateExamPrepWeeklyPlansInput(
        {
          'sem1-r2': {
            weeks: {
              '2': { unknown: '내용' },
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
              '2': { korean: 'a'.repeat(MAX_EXAM_PREP_WEEKLY_PLAN_CONTENT_LENGTH + 1) },
            },
          },
        },
        { allowedSubjectIds, examPrepWeeksByRound }
      )
    ).toEqual({
      error: `내용은 ${MAX_EXAM_PREP_WEEKLY_PLAN_CONTENT_LENGTH}자 이하여야 합니다.`,
    });
  });
});

describe('getExamPrepWeeklyPlanContent', () => {
  it('returns stored content for a round, week, and subject', () => {
    const plans = resolveExamPrepWeeklyPlans({
      'sem1-r2': {
        weeks: {
          '3': { math: '오답노트' },
        },
      },
    });

    expect(getExamPrepWeeklyPlanContent(plans, 'sem1-r2', 3, 'math')).toBe('오답노트');
    expect(getExamPrepWeeklyPlanContent(plans, 'sem1-r2', 4, 'math')).toBeNull();
    expect(createEmptyExamPrepWeeklyPlans()).toEqual({});
  });
});
