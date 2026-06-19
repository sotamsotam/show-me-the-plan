import { describe, expect, it } from 'vitest';

import {
  assignExamRoundSlots,
  buildExamRoundPreview,
  classifyRoundFromTitle,
  classifySemesterFromTitle,
  createDefaultExamPrepWeeksByRound,
  DEFAULT_EXAM_PREP_WEEKS,
  formatExamCountdownLabel,
  groupExamEvents,
  isDateInExamPrepPeriod,
  isDateInPrepWeek,
  listPrepWeekNumbers,
  resolveActiveExamCountdown,
  resolveActiveExamCountdownFromPreview,
  resolveExamCountdownYearDateRange,
  resolveExamPrepPeriods,
  resolveExamPrepPeriodsFromPreview,
  resolveExamPrepDaysRemaining,
  resolveExamPrepWeeksBefore,
  resolveExamPrepWeeksByRound,
  resolvePrepWeekDateRange,
  resolvePrepWeekNumber,
  resolveSemesterFromDate,
  resolveSummerVacationPeriod,
  validateExamPrepWeeksByRoundInput,
} from './exam-countdown';

describe('resolveExamPrepWeeksBefore', () => {
  it('returns default when value is missing', () => {
    expect(resolveExamPrepWeeksBefore(undefined)).toBe(DEFAULT_EXAM_PREP_WEEKS);
    expect(resolveExamPrepWeeksBefore(null)).toBe(DEFAULT_EXAM_PREP_WEEKS);
  });

  it('returns valid custom weeks', () => {
    expect(resolveExamPrepWeeksBefore(6)).toBe(6);
  });

  it('falls back to default for invalid values', () => {
    expect(resolveExamPrepWeeksBefore(0)).toBe(DEFAULT_EXAM_PREP_WEEKS);
    expect(resolveExamPrepWeeksBefore(13)).toBe(DEFAULT_EXAM_PREP_WEEKS);
  });
});

describe('resolveExamPrepWeeksByRound', () => {
  it('fills all slots from legacy weeks before', () => {
    expect(resolveExamPrepWeeksByRound(null, 6)).toEqual({
      defaultWeeks: 6,
      weeksBySlot: {
        'sem1-r1': 6,
        'sem1-r2': 6,
        'sem2-r1': 6,
        'sem2-r2': 6,
      },
    });
  });

  it('merges stored slot values', () => {
    expect(
      resolveExamPrepWeeksByRound({
        weeksBySlot: {
          'sem1-r1': 3,
          'sem1-r2': 6,
          'sem2-r1': 3,
          'sem2-r2': 8,
        },
      })
    ).toEqual({
      defaultWeeks: 4,
      weeksBySlot: {
        'sem1-r1': 3,
        'sem1-r2': 6,
        'sem2-r1': 3,
        'sem2-r2': 8,
      },
    });
  });
});

describe('validateExamPrepWeeksByRoundInput', () => {
  it('accepts valid slot values', () => {
    expect(
      validateExamPrepWeeksByRoundInput({
        weeksBySlot: {
          'sem1-r1': 3,
          'sem1-r2': 4,
          'sem2-r1': 5,
          'sem2-r2': 6,
        },
      })
    ).toEqual({
      defaultWeeks: 4,
      weeksBySlot: {
        'sem1-r1': 3,
        'sem1-r2': 4,
        'sem2-r1': 5,
        'sem2-r2': 6,
      },
    });
  });

  it('rejects invalid slot values', () => {
    expect(
      validateExamPrepWeeksByRoundInput({
        weeksBySlot: {
          'sem1-r1': 0,
          'sem1-r2': 4,
          'sem2-r1': 5,
          'sem2-r2': 6,
        },
      })
    ).toBeNull();
  });
});

describe('resolveSummerVacationPeriod', () => {
  it('finds summer vacation start and the day before reopening', () => {
    expect(
      resolveSummerVacationPeriod([
        { date: '20260720', title: '여름방학' },
        { date: '20260818', title: '2학기 개학' },
      ])
    ).toEqual({
      start: '20260720',
      end: '20260817',
    });
  });
});

describe('resolveSemesterFromDate', () => {
  const summerVacation = { start: '20260720', end: '20260817' };

  it('treats dates before summer vacation as semester 1', () => {
    expect(resolveSemesterFromDate('20260510', summerVacation)).toBe(1);
  });

  it('treats dates after summer vacation as semester 2', () => {
    expect(resolveSemesterFromDate('20260901', summerVacation)).toBe(2);
  });
});

describe('classifyRoundFromTitle', () => {
  it('detects round numbers from common school labels', () => {
    expect(classifyRoundFromTitle('1학기 1회고사')).toBe(1);
    expect(classifyRoundFromTitle('2학기 2회고사')).toBe(2);
    expect(classifyRoundFromTitle('중간고사')).toBe(1);
    expect(classifyRoundFromTitle('기말고사')).toBe(2);
  });
});

describe('assignExamRoundSlots', () => {
  const holidays = [
    { date: '20260720', title: '여름방학' },
    { date: '20260818', title: '2학기 개학' },
  ];

  it('assigns four exam rounds across semesters', () => {
    const groups = groupExamEvents([
      { date: '20260428', title: '1학기 1회고사' },
      { date: '20260620', title: '1학기 2회고사' },
      { date: '20261020', title: '2학기 1회고사' },
      { date: '20261110', title: '2학기 2회고사 1일차' },
      { date: '20261111', title: '2학기 2회고사 2일차' },
    ]);

    expect(assignExamRoundSlots(groups, holidays)).toEqual([
      {
        label: '1학기 1회고사',
        firstDay: '20260428',
        lastDay: '20260428',
        roundSlot: 'sem1-r1',
      },
      {
        label: '1학기 2회고사',
        firstDay: '20260620',
        lastDay: '20260620',
        roundSlot: 'sem1-r2',
      },
      {
        label: '2학기 1회고사',
        firstDay: '20261020',
        lastDay: '20261020',
        roundSlot: 'sem2-r1',
      },
      {
        label: '2학기 2회고사 1일차',
        firstDay: '20261110',
        lastDay: '20261111',
        roundSlot: 'sem2-r2',
      },
    ]);
  });
});

describe('buildExamRoundPreview', () => {
  it('returns empty slots when schedule data is missing', () => {
    expect(buildExamRoundPreview([])).toEqual([
      {
        slot: 'sem1-r1',
        label: null,
        firstDay: null,
        lastDay: null,
        hasSchedule: false,
      },
      {
        slot: 'sem1-r2',
        label: null,
        firstDay: null,
        lastDay: null,
        hasSchedule: false,
      },
      {
        slot: 'sem2-r1',
        label: null,
        firstDay: null,
        lastDay: null,
        hasSchedule: false,
      },
      {
        slot: 'sem2-r2',
        label: null,
        firstDay: null,
        lastDay: null,
        hasSchedule: false,
      },
    ]);
  });
});

describe('resolveExamCountdownYearDateRange', () => {
  it('covers the full calendar year', () => {
    expect(resolveExamCountdownYearDateRange(new Date(2026, 5, 16))).toEqual({
      fromDate: '20260101',
      toDate: '20261231',
    });
  });
});

describe('groupExamEvents', () => {
  it('groups consecutive multi-day exams with the first day label', () => {
    expect(
      groupExamEvents([
        { date: '20260610', title: '2학기 지필평가 1일차' },
        { date: '20260611', title: '2학기 지필평가 2일차' },
        { date: '20260612', title: '2학기 지필평가 3일차' },
      ])
    ).toEqual([
      {
        label: '2학기 지필평가 1일차',
        firstDay: '20260610',
        lastDay: '20260612',
      },
    ]);
  });
});

describe('resolveActiveExamCountdown', () => {
  const exams = [
    { date: '20260610', title: '2학기 지필평가 1일차' },
    { date: '20260611', title: '2학기 지필평가 2일차' },
    { date: '20260701', title: '2차시험' },
  ];
  const settings = createDefaultExamPrepWeeksByRound(4);

  it('shows prep week number during the configured prep period', () => {
    const result = resolveActiveExamCountdown(exams, settings, '20260527');

    expect(result).toEqual({
      label: '2학기 지필평가 1일차',
      prepWeekNumber: 2,
      daysRemaining: 14,
      examDate: '20260610',
    });
    expect(formatExamCountdownLabel(result!)).toBe('D-2주차 (2학기 지필평가 1일차)');
  });

  it('shows D-0주 during the exam week', () => {
    expect(resolveActiveExamCountdown(exams, settings, '20260610')).toEqual({
      label: '2학기 지필평가 1일차',
      prepWeekNumber: 0,
      daysRemaining: 0,
      examDate: '20260610',
    });

    expect(resolveActiveExamCountdown(exams, settings, '20260611')).toEqual({
      label: '2학기 지필평가 1일차',
      prepWeekNumber: 0,
      daysRemaining: -1,
      examDate: '20260610',
    });
  });

  it('moves to the next exam after the first exam week ends', () => {
    expect(resolveActiveExamCountdown(exams, settings, '20260615')).toEqual({
      label: '2차시험',
      prepWeekNumber: 2,
      daysRemaining: 16,
      examDate: '20260701',
    });
    expect(resolveActiveExamCountdown(exams, settings, '20260607')?.prepWeekNumber).toBe(1);
  });

  it('returns null before the prep period starts', () => {
    expect(resolveActiveExamCountdown(exams, settings, '20260501')).toBeNull();
    expect(resolveActiveExamCountdown(exams, settings, '20260510')).toBeNull();
  });

  it('shows countdown from the Monday-aligned prep start', () => {
    expect(resolveActiveExamCountdown(exams, settings, '20260511')).toEqual({
      label: '2학기 지필평가 1일차',
      prepWeekNumber: 4,
      daysRemaining: 30,
      examDate: '20260610',
    });
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

  it('returns prep week numbers before the exam week', () => {
    expect(
      resolveActiveExamCountdownFromPreview(preview, settings, '20260518')?.prepWeekNumber
    ).toBe(3);
  });

  it('returns D-0주 during the exam week', () => {
    expect(
      resolveActiveExamCountdownFromPreview(preview, settings, '20260610')?.prepWeekNumber
    ).toBe(0);
  });
});

describe('resolveExamPrepPeriodsFromPreview', () => {
  it('builds prep periods from effective preview items', () => {
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

describe('resolveExamPrepPeriods', () => {
  const exams = [
    { date: '20260610', title: '2학기 지필평가 1일차' },
    { date: '20260611', title: '2학기 지필평가 2일차' },
    { date: '20260612', title: '2학기 지필평가 3일차' },
    { date: '20260701', title: '2차시험' },
  ];

  it('covers the configured prep window through the last exam day', () => {
    const settings = createDefaultExamPrepWeeksByRound(4);

    expect(resolveExamPrepPeriods(exams, settings)).toEqual([
      {
        label: '2학기 지필평가 1일차',
        prepStart: '20260511',
        examFirstDay: '20260610',
        prepEnd: '20260612',
        roundSlot: 'sem2-r1',
      },
      {
        label: '2차시험',
        prepStart: '20260601',
        examFirstDay: '20260701',
        prepEnd: '20260701',
        roundSlot: 'sem1-r2',
      },
    ]);
  });

  it('uses different weeks per round slot', () => {
    const settings = resolveExamPrepWeeksByRound({
      weeksBySlot: {
        'sem1-r1': 3,
        'sem1-r2': 6,
        'sem2-r1': 3,
        'sem2-r2': 8,
      },
    });

    const periods = resolveExamPrepPeriods(
      [
        { date: '20260428', title: '1학기 1회고사' },
        { date: '20260620', title: '1학기 2회고사' },
      ],
      settings,
      [{ date: '20260720', title: '여름방학' }]
    );

    expect(periods[0].prepStart).toBe('20260406');
    expect(periods[1].prepStart).toBe('20260504');
  });

  it('detects whether a date is inside any prep period', () => {
    const periods = resolveExamPrepPeriods(exams, createDefaultExamPrepWeeksByRound(4));

    expect(isDateInExamPrepPeriod('20260511', periods)).toBe(true);
    expect(isDateInExamPrepPeriod('20260612', periods)).toBe(true);
    expect(isDateInExamPrepPeriod('20260510', periods)).toBe(false);
    expect(isDateInExamPrepPeriod('20260702', periods)).toBe(false);
  });

  it('returns remaining days until the nearest exam first day', () => {
    const periods = resolveExamPrepPeriods(exams, createDefaultExamPrepWeeksByRound(4));

    expect(resolveExamPrepDaysRemaining('20260527', periods)).toBe(14);
    expect(resolveExamPrepDaysRemaining('20260610', periods)).toBe(0);
    expect(resolveExamPrepDaysRemaining('20260611', periods)).toBe(20);
    expect(resolveExamPrepDaysRemaining('20260510', periods)).toBeNull();
    expect(resolveExamPrepDaysRemaining('20260511', periods)).toBe(30);
  });
});

describe('classifySemesterFromTitle', () => {
  it('reads semester from title when available', () => {
    expect(classifySemesterFromTitle('1학기 1회고사')).toBe(1);
    expect(classifySemesterFromTitle('2학기 지필평가')).toBe(2);
  });
});

describe('listPrepWeekNumbers', () => {
  it('returns descending week numbers for valid prep weeks', () => {
    expect(listPrepWeekNumbers(4)).toEqual([4, 3, 2, 1]);
    expect(listPrepWeekNumbers(1)).toEqual([1]);
  });

  it('returns an empty list for invalid prep weeks', () => {
    expect(listPrepWeekNumbers(0)).toEqual([]);
    expect(listPrepWeekNumbers(13)).toEqual([]);
    expect(listPrepWeekNumbers(2.5)).toEqual([]);
  });
});

describe('resolvePrepWeekDateRange', () => {
  const period = {
    prepStart: '20260511',
    examFirstDay: '20260610',
  };

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
  const period = {
    prepStart: '20260511',
    examFirstDay: '20260610',
  };

  it('returns the countdown week number for dates inside the prep window', () => {
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

describe('isDateInPrepWeek', () => {
  const period = {
    prepStart: '20260511',
    examFirstDay: '20260610',
  };

  it('checks membership for a specific prep week', () => {
    expect(isDateInPrepWeek('20260511', period, 4, 4)).toBe(true);
    expect(isDateInPrepWeek('20260518', period, 4, 4)).toBe(false);
    expect(isDateInPrepWeek('20260601', period, 1, 4)).toBe(true);
    expect(isDateInPrepWeek('20260608', period, 1, 4)).toBe(true);
    expect(isDateInPrepWeek('20260610', period, 1, 4)).toBe(false);
  });
});
