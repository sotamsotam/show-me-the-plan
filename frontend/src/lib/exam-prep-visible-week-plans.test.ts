import { describe, expect, it } from 'vitest';

import { createDefaultExamPrepWeeksByRound } from './exam-countdown';
import { resolveExamPrepWeeklyPlansContext } from './exam-prep-weekly-plans-context';
import {
  resolveVisiblePrepWeekPlans,
  isVisibleRangeInAnyExamPrepWeekPlanPeriod,
  type VisibleDateRange,
} from './exam-prep-visible-week-plans';

function localDate(ymd: string): Date {
  const year = Number(ymd.slice(0, 4));
  const month = Number(ymd.slice(4, 6)) - 1;
  const day = Number(ymd.slice(6, 8));
  return new Date(year, month, day);
}

function visibleRange(startYmd: string, endExclusiveYmd: string): VisibleDateRange {
  return {
    start: localDate(startYmd),
    end: localDate(endExclusiveYmd),
  };
}

function planItem(id: string, title: string) {
  return { id, title };
}

describe('resolveVisiblePrepWeekPlans', () => {
  const examPrepWeeksByRound = createDefaultExamPrepWeeksByRound(4);
  const subjects = [
    { id: 'korean', label: '국어', source: 'custom' as const },
    { id: 'english', label: '영어', source: 'custom' as const },
  ];

  const context = resolveExamPrepWeeklyPlansContext({
    examPrepWeeksBefore: 4,
    examPrepWeeksByRound,
    examPrepWeeklyPlans: {
      'sem1-r2': {
        weeks: {
          '4': {
            korean: [planItem('k4', '교과서 1-3단원 1회독')],
          },
          '3': {
            english: [planItem('e3', '문법 정리')],
          },
          '1': {
            english: [planItem('e1', '단어 암기')],
          },
        },
      },
      'sem2-r1': {
        weeks: {
          '1': {
            korean: [planItem('k2', '2학기 기출 정리')],
          },
        },
      },
    },
    subjects,
    examRoundPreview: [
      {
        slot: 'sem1-r2',
        label: '1학기 2회고사',
        firstDay: '20260610',
        lastDay: '20260610',
        hasSchedule: true,
      },
      {
        slot: 'sem2-r1',
        label: '2학기 1회고사',
        firstDay: '20261020',
        lastDay: '20261020',
        hasSchedule: true,
      },
    ],
  });

  it('returns overlapping prep weeks for the visible calendar range', () => {
    const rounds = resolveVisiblePrepWeekPlans(
      visibleRange('20260511', '20260518'),
      context
    );

    expect(rounds).toHaveLength(1);
    expect(rounds[0]).toMatchObject({
      roundSlot: 'sem1-r2',
      roundLabel: '1학기 2회고사',
      weeks: [
        {
          weekNumber: 4,
          weekStart: '20260511',
          weekEnd: '20260517',
          subjects: [
            {
              subjectId: 'korean',
              items: [planItem('k4', '교과서 1-3단원 1회독')],
            },
          ],
        },
      ],
    });
  });

  it('returns a different week when the visible range moves forward', () => {
    const rounds = resolveVisiblePrepWeekPlans(
      visibleRange('20260603', '20260610'),
      context
    );

    expect(rounds).toHaveLength(1);
    expect(rounds[0]?.weeks).toEqual([
      {
        weekNumber: 1,
        weekStart: '20260601',
        weekEnd: '20260609',
        subjects: [{ subjectId: 'english', items: [planItem('e1', '단어 암기')] }],
      },
    ]);
  });

  it('returns a single week when the visible range no longer spans a prep-week boundary', () => {
    const rounds = resolveVisiblePrepWeekPlans(
      visibleRange('20260519', '20260527'),
      context
    );

    expect(rounds).toHaveLength(1);
    expect(rounds[0]?.weeks.map((week) => week.weekNumber)).toEqual([3]);
    expect(rounds[0]?.weeks[0]?.subjects[0]).toEqual({
      subjectId: 'english',
      items: [planItem('e3', '문법 정리')],
    });
  });

  it('returns multiple rounds when each round overlaps the visible range', () => {
    const rounds = resolveVisiblePrepWeekPlans(
      visibleRange('20261013', '20261021'),
      context
    );

    expect(rounds).toHaveLength(1);
    expect(rounds[0]).toMatchObject({
      roundSlot: 'sem2-r1',
      weeks: [
        {
          weekNumber: 1,
          weekStart: '20261012',
          weekEnd: '20261019',
          subjects: [{ subjectId: 'korean', items: [planItem('k2', '2학기 기출 정리')] }],
        },
      ],
    });
  });

  it('returns an empty list outside prep periods or with empty content', () => {
    expect(
      resolveVisiblePrepWeekPlans(visibleRange('20260105', '20260112'), context)
    ).toEqual([]);

    const emptyContentContext = {
      ...context,
      plans: {
        'sem1-r2': {
          weeks: {
            '4': { korean: [] },
          },
        },
      },
    };

    expect(
      resolveVisiblePrepWeekPlans(visibleRange('20260511', '20260518'), emptyContentContext)
    ).toEqual([]);
  });

  it('returns an empty list after the exam day', () => {
    expect(
      resolveVisiblePrepWeekPlans(visibleRange('20260610', '20260617'), context)
    ).toEqual([]);
  });

  it('returns an empty list before the prep period starts', () => {
    expect(
      resolveVisiblePrepWeekPlans(visibleRange('20260428', '20260505'), context)
    ).toEqual([]);
  });
});

describe('isVisibleRangeInAnyExamPrepWeekPlanPeriod', () => {
  const examPrepWeeksByRound = createDefaultExamPrepWeeksByRound(4);
  const context = resolveExamPrepWeeklyPlansContext({
    examPrepWeeksBefore: 4,
    examPrepWeeksByRound,
    examPrepWeeklyPlans: {},
    subjects: [],
    examRoundPreview: [
      {
        slot: 'sem1-r2',
        label: '1학기 2회고사',
        firstDay: '20260610',
        lastDay: '20260610',
        hasSchedule: true,
      },
    ],
  });

  it('is true during the prep period', () => {
    expect(
      isVisibleRangeInAnyExamPrepWeekPlanPeriod(visibleRange('20260511', '20260518'), context)
    ).toBe(true);
  });

  it('is false before the prep period', () => {
    expect(
      isVisibleRangeInAnyExamPrepWeekPlanPeriod(visibleRange('20260428', '20260505'), context)
    ).toBe(false);
  });

  it('is false on or after the exam day', () => {
    expect(
      isVisibleRangeInAnyExamPrepWeekPlanPeriod(visibleRange('20260610', '20260617'), context)
    ).toBe(false);
  });
});
