import { describe, expect, it } from 'vitest';

import {
  formatPrepDayLabel,
  formatPrepWeekLabel,
  isDateInPrepWeek,
  listPrepWeekNumbers,
  mondayOnOrBefore,
  resolveActiveExamCountdown,
  resolveActiveExamCountdownFromPreview,
  resolveExamPrepPeriodsFromPreview,
  resolveExamPrepWeekPeriod,
  resolveNearestScheduledRoundSlot,
  resolvePrepPeriodStart,
  resolvePrepWeekDateRange,
  resolvePrepWeekNumber,
  resolveStudyPlanTodoQueryRangeForExamPrep,
  createDefaultExamPrepWeeksByRound,
  formatExamCountdownLabel,
} from './exam-countdown';

describe('listPrepWeekNumbers', () => {
  it('returns descending week numbers for valid prep weeks', () => {
    expect(listPrepWeekNumbers(4)).toEqual([4, 3, 2, 1]);
    expect(listPrepWeekNumbers(1)).toEqual([1]);
  });

  it('returns an empty list for invalid prep weeks', () => {
    expect(listPrepWeekNumbers(0)).toEqual([]);
    expect(listPrepWeekNumbers(13)).toEqual([]);
  });
});

describe('resolveNearestScheduledRoundSlot', () => {
  const preview = [
    {
      slot: 'sem1-r1' as const,
      label: '1학기 1회고사',
      firstDay: '20260428',
      lastDay: '20260428',
      hasSchedule: true,
    },
    {
      slot: 'sem1-r2' as const,
      label: '1학기 2회고사',
      firstDay: '20260620',
      lastDay: '20260620',
      hasSchedule: true,
    },
    {
      slot: 'sem2-r1' as const,
      label: '2학기 1회고사',
      firstDay: '20261020',
      lastDay: '20261020',
      hasSchedule: true,
    },
    {
      slot: 'sem2-r2' as const,
      label: null,
      firstDay: null,
      lastDay: null,
      hasSchedule: false,
    },
  ];

  it('selects the scheduled round closest to today', () => {
    expect(resolveNearestScheduledRoundSlot(preview, '20260610')).toBe('sem1-r2');
    expect(resolveNearestScheduledRoundSlot(preview, '20260501')).toBe('sem1-r1');
    expect(resolveNearestScheduledRoundSlot(preview, '20260901')).toBe('sem2-r1');
  });

  it('prefers an upcoming round when two rounds are equally close', () => {
    const tiedPreview = [
      {
        slot: 'sem1-r1' as const,
        label: '1학기 1회고사',
        firstDay: '20260601',
        lastDay: '20260601',
        hasSchedule: true,
      },
      {
        slot: 'sem1-r2' as const,
        label: '1학기 2회고사',
        firstDay: '20260615',
        lastDay: '20260615',
        hasSchedule: true,
      },
    ];

    expect(resolveNearestScheduledRoundSlot(tiedPreview, '20260608')).toBe('sem1-r2');
  });

  it('falls back to sem1-r1 when no schedule exists', () => {
    expect(resolveNearestScheduledRoundSlot([], '20260610')).toBe('sem1-r1');
  });
});

describe('mondayOnOrBefore', () => {
  it('returns the same date when already Monday', () => {
    expect(mondayOnOrBefore('20260511')).toBe('20260511');
  });

  it('returns the Monday of the same calendar week', () => {
    expect(mondayOnOrBefore('20260610')).toBe('20260608');
  });
});

describe('resolvePrepPeriodStart', () => {
  it('starts on the Monday of the Nth week before the exam week', () => {
    expect(resolvePrepPeriodStart('20260610', 4)).toBe('20260511');
  });

  it('matches resolveExamPrepWeekPeriod', () => {
    expect(resolveExamPrepWeekPeriod('20260610', 4)).toEqual({
      prepStart: '20260511',
      examFirstDay: '20260610',
    });
  });
});

describe('resolvePrepWeekDateRange', () => {
  const period = resolveExamPrepWeekPeriod('20260610', 4);

  it('maps each prep week to Mon-Sun blocks with D-1 extended through the day before the exam', () => {
    expect(resolvePrepWeekDateRange(period, 4, 4)).toEqual({
      weekNumber: 4,
      start: '20260511',
      end: '20260517',
    });
    expect(resolvePrepWeekDateRange(period, 3, 4)).toEqual({
      weekNumber: 3,
      start: '20260518',
      end: '20260524',
    });
    expect(resolvePrepWeekDateRange(period, 2, 4)).toEqual({
      weekNumber: 2,
      start: '20260525',
      end: '20260531',
    });
    expect(resolvePrepWeekDateRange(period, 1, 4)).toEqual({
      weekNumber: 1,
      start: '20260601',
      end: '20260609',
    });
  });

  it('returns null for invalid week numbers', () => {
    expect(resolvePrepWeekDateRange(period, 0, 4)).toBeNull();
    expect(resolvePrepWeekDateRange(period, 5, 4)).toBeNull();
    expect(resolvePrepWeekDateRange(period, 2, 0)).toBeNull();
  });
});

describe('resolvePrepWeekNumber', () => {
  const period = resolveExamPrepWeekPeriod('20260610', 4);

  it('returns the prep week number for dates inside the prep window', () => {
    expect(resolvePrepWeekNumber('20260511', period, 4)).toBe(4);
    expect(resolvePrepWeekNumber('20260517', period, 4)).toBe(4);
    expect(resolvePrepWeekNumber('20260518', period, 4)).toBe(3);
    expect(resolvePrepWeekNumber('20260609', period, 4)).toBe(1);
    expect(resolvePrepWeekNumber('20260608', period, 4)).toBe(1);
  });

  it('returns null outside the prep window or on the exam day', () => {
    expect(resolvePrepWeekNumber('20260510', period, 4)).toBeNull();
    expect(resolvePrepWeekNumber('20260610', period, 4)).toBeNull();
    expect(resolvePrepWeekNumber('20260611', period, 4)).toBeNull();
  });
});

describe('formatPrepWeekLabel', () => {
  it('formats prep weeks and the exam week', () => {
    expect(formatPrepWeekLabel(4)).toBe('D-4주차');
    expect(formatPrepWeekLabel(1)).toBe('D-1주차');
    expect(formatPrepWeekLabel(0)).toBe('D-0주');
  });
});

describe('formatPrepDayLabel', () => {
  it('formats prep day labels', () => {
    expect(formatPrepDayLabel(23)).toBe('D-23');
    expect(formatPrepDayLabel(1)).toBe('D-1');
    expect(formatPrepDayLabel(0)).toBe('D-0');
  });
});

describe('resolveActiveExamCountdown', () => {
  const exams = [{ date: '20260610', title: '1학기 2회고사' }];
  const settings = createDefaultExamPrepWeeksByRound(4);

  it('returns prep week numbers before the exam week', () => {
    expect(resolveActiveExamCountdown(exams, settings, '20260518')?.prepWeekNumber).toBe(3);
    expect(formatExamCountdownLabel(resolveActiveExamCountdown(exams, settings, '20260518')!)).toBe(
      'D-3주차 (1학기 2회고사)'
    );
  });

  it('returns D-0주 during the exam week', () => {
    expect(resolveActiveExamCountdown(exams, settings, '20260610')?.prepWeekNumber).toBe(0);
    expect(resolveActiveExamCountdown(exams, settings, '20260608')?.prepWeekNumber).toBe(0);
  });
});

describe('resolveActiveExamCountdownFromPreview', () => {
  const settings = createDefaultExamPrepWeeksByRound(4);
  const preview = [
    {
      slot: 'sem1-r2' as const,
      label: '1학기 2회고사',
      firstDay: '20260610',
      lastDay: '20260612',
      hasSchedule: true,
    },
  ];

  it('matches event-based countdown for saved preview dates', () => {
    const exams = [{ date: '20260610', title: '1학기 2회고사' }];

    expect(resolveActiveExamCountdownFromPreview(preview, settings, '20260518')).toEqual(
      resolveActiveExamCountdown(exams, settings, '20260518')
    );
  });
});

describe('resolveExamPrepPeriodsFromPreview', () => {
  it('builds prep periods from preview items', () => {
    expect(
      resolveExamPrepPeriodsFromPreview(
        [
          {
            slot: 'sem1-r2',
            label: '1학기 2회고사',
            firstDay: '20260610',
            lastDay: '20260612',
            hasSchedule: true,
          },
        ],
        createDefaultExamPrepWeeksByRound(4)
      )
    ).toEqual([
      {
        label: '1학기 2회고사',
        prepStart: '20260511',
        examFirstDay: '20260610',
        prepEnd: '20260612',
        roundSlot: 'sem1-r2',
      },
    ]);
  });
});

describe('resolveStudyPlanTodoQueryRangeForExamPrep', () => {
  it('covers prep weeks through exam last day with exclusive API end', () => {
    expect(
      resolveStudyPlanTodoQueryRangeForExamPrep(
        [
          {
            slot: 'sem1-r2',
            label: '1학기 2회고사',
            firstDay: '20260610',
            lastDay: '20260612',
            hasSchedule: true,
          },
        ],
        createDefaultExamPrepWeeksByRound(4)
      )
    ).toEqual({
      start: '2026-05-11',
      end: '2026-06-13',
    });
  });
});

describe('isDateInPrepWeek', () => {
  const period = resolveExamPrepWeekPeriod('20260610', 4);

  it('checks membership for a specific prep week', () => {
    expect(isDateInPrepWeek('20260511', period, 4, 4)).toBe(true);
    expect(isDateInPrepWeek('20260518', period, 4, 4)).toBe(false);
    expect(isDateInPrepWeek('20260601', period, 1, 4)).toBe(true);
    expect(isDateInPrepWeek('20260608', period, 1, 4)).toBe(true);
    expect(isDateInPrepWeek('20260610', period, 1, 4)).toBe(false);
  });
});
