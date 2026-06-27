import { describe, expect, it } from 'vitest';

import { createDefaultExamPrepWeeksByRound } from './exam-countdown';
import { resolveExamPrepWeeklyPlansContext } from './exam-prep-weekly-plans-context';
import { buildVacationPeriodPreviewFromSettings } from './vacation-period-settings';
import { createEmptyRegularWeeklyPlansContext } from './regular-weekly-plans-context';
import { resolveVacationWeeklyPlansContext } from './vacation-weekly-plans-context';
import { resolveVisibleVacationWeekPlans } from './vacation-visible-week-plans';
import {
  isVisibleRangeInAnyWeeklyPlanPeriod,
  resolveVisibleWeeklyPlanSections,
} from './weekly-plan-panel';
import type { VisibleDateRange } from './exam-prep-visible-week-plans';

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

describe('resolveVisibleVacationWeekPlans', () => {
  const subjects = [{ id: 'math', label: '수학', source: 'custom' as const }];
  const context = resolveVacationWeeklyPlansContext({
    vacationWeeklyPlans: {
      summer: {
        weeks: {
          '2': { math: '여름방학 2주차 복습' },
        },
      },
    },
    vacationPeriodPreview: buildVacationPeriodPreviewFromSettings({
      summer: { start: '20260720', end: '20260817' },
      winter: null,
    }),
    subjects,
  });

  it('returns overlapping vacation weeks for settings-based periods', () => {
    const periods = resolveVisibleVacationWeekPlans(
      visibleRange('20260727', '20260803'),
      context
    );

    expect(periods).toEqual([
      {
        periodKey: 'summer',
        periodLabel: '여름방학',
        weeks: [
          {
            weekNumber: 2,
            weekStart: '20260727',
            weekEnd: '20260802',
            subjects: [
              {
                subjectId: 'math',
                items: [expect.objectContaining({ title: '여름방학 2주차 복습' })],
              },
            ],
          },
        ],
      },
    ]);
  });
});

describe('resolveVisibleWeeklyPlanSections', () => {
  const subjects = [
    { id: 'korean', label: '국어', source: 'custom' as const },
    { id: 'math', label: '수학', source: 'custom' as const },
  ];
  const examContext = resolveExamPrepWeeklyPlansContext({
    examPrepWeeksBefore: 4,
    examPrepWeeksByRound: createDefaultExamPrepWeeksByRound(4),
    examPrepWeeklyPlans: {
      'sem1-r2': {
        weeks: {
          '4': { korean: [{ id: 'k-1', title: '교과서 1-3단원 1회독' }] },
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
    ],
  });
  const vacationContext = resolveVacationWeeklyPlansContext({
    vacationWeeklyPlans: {
      summer: {
        weeks: {
          '1': { math: '방학 복습' },
        },
      },
    },
    vacationPeriodPreview: buildVacationPeriodPreviewFromSettings({
      summer: { start: '20260720', end: '20260817' },
      winter: null,
    }),
    subjects,
  });

  it('includes vacation sections with date-only headers', () => {
    const sections = resolveVisibleWeeklyPlanSections(
      visibleRange('20260720', '20260727'),
      examContext,
      vacationContext,
      createEmptyRegularWeeklyPlansContext()
    );

    expect(sections).toHaveLength(1);
    expect(sections[0]).toMatchObject({
      kind: 'vacation',
      sectionLabel: '여름방학',
      weeks: [
        {
          weekNumber: 1,
          weekStart: '20260720',
          weekEnd: '20260726',
          showWeekLabel: false,
          weekLabel: null,
        },
      ],
    });
  });
});

describe('isVisibleRangeInAnyWeeklyPlanPeriod', () => {
  const examContext = resolveExamPrepWeeklyPlansContext({
    examPrepWeeksBefore: 4,
    examPrepWeeksByRound: createDefaultExamPrepWeeksByRound(4),
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
  const vacationContext = resolveVacationWeeklyPlansContext({
    vacationWeeklyPlans: {},
    vacationPeriodPreview: buildVacationPeriodPreviewFromSettings({
      summer: { start: '20260720', end: '20260817' },
      winter: null,
    }),
    subjects: [],
  });

  it('is true during settings-based vacation periods', () => {
    expect(
      isVisibleRangeInAnyWeeklyPlanPeriod(
        visibleRange('20260727', '20260803'),
        examContext,
        vacationContext,
        createEmptyRegularWeeklyPlansContext()
      )
    ).toBe(true);
  });
});
