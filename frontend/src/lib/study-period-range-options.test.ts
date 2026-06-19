import { describe, expect, it } from 'vitest';
import { createDefaultExamPrepWeeksByRound } from '@/lib/exam-countdown';
import type { ExamRoundPreviewItem } from '@/lib/exam-countdown';
import {
  buildStudyPeriodRangeOptions,
  findMatchingStudyPeriodKey,
  resolveCurrentStudyPeriodOption,
  resolveDefaultStudyPeriodRange,
  resolvePreviousMatchingStudyPeriodOption,
  resolvePreviousStudyPeriodOption,
  studyPeriodRangeToIsoRange,
} from '@/lib/study-period-range-options';
import type { VacationPeriodSettings } from '@/lib/vacation-period-settings';

const fullVacationSettings: VacationPeriodSettings = {
  summer: { start: '20260720', end: '20260831' },
  winter: { start: '20260120', end: '20260228' },
};

const fullExamPreview: ExamRoundPreviewItem[] = [
  {
    slot: 'sem1-r1',
    label: '1학기 1회차',
    firstDay: '20260510',
    lastDay: '20260514',
    hasSchedule: true,
  },
  {
    slot: 'sem1-r2',
    label: '1학기 2회차',
    firstDay: '20260705',
    lastDay: '20260709',
    hasSchedule: true,
  },
  {
    slot: 'sem2-r1',
    label: '2학기 1회차',
    firstDay: '20261110',
    lastDay: '20261114',
    hasSchedule: true,
  },
  {
    slot: 'sem2-r2',
    label: '2학기 2회차',
    firstDay: '20261215',
    lastDay: '20261219',
    hasSchedule: true,
  },
];

describe('buildStudyPeriodRangeOptions', () => {
  it('includes vacation, exam prep, exam, and regular period options sorted by start date', () => {
    const options = buildStudyPeriodRangeOptions({
      vacationPeriodSettings: fullVacationSettings,
      examRoundPreview: fullExamPreview,
      examPrepWeeksByRound: createDefaultExamPrepWeeksByRound(4),
    });

    expect(options.length).toBeGreaterThan(0);
    expect(options.some((item) => item.key === 'winter-vacation' && item.kind === 'vacation')).toBe(
      true
    );
    expect(options.some((item) => item.key === 'sem1-r1-prep' && item.kind === 'exam-prep')).toBe(
      true
    );
    expect(options.some((item) => item.key === 'sem1-r1-exam' && item.kind === 'exam')).toBe(true);
    expect(
      options.some(
        (item) => item.key === 'regular-after-winter-before-sem1-r1' && item.kind === 'regular'
      )
    ).toBe(true);

    for (let index = 1; index < options.length; index += 1) {
      expect(options[index - 1].start <= options[index].start).toBe(true);
    }
  });

  it('converts selected option to ISO date range and matches current range', () => {
    const options = buildStudyPeriodRangeOptions({
      vacationPeriodSettings: fullVacationSettings,
      examRoundPreview: fullExamPreview,
      examPrepWeeksByRound: createDefaultExamPrepWeeksByRound(4),
    });
    const summerVacation = options.find((item) => item.key === 'summer-vacation');

    expect(summerVacation).toBeDefined();
    expect(studyPeriodRangeToIsoRange(summerVacation!)).toEqual({
      start: '2026-07-20',
      end: '2026-08-31',
    });
    expect(
      findMatchingStudyPeriodKey(options, '2026-07-20', '2026-08-31')
    ).toBe('summer-vacation');
  });

  it('selects the period containing the given date as default', () => {
    const options = buildStudyPeriodRangeOptions({
      vacationPeriodSettings: fullVacationSettings,
      examRoundPreview: fullExamPreview,
      examPrepWeeksByRound: createDefaultExamPrepWeeksByRound(4),
    });

    expect(resolveDefaultStudyPeriodRange(options, '20260725')).toEqual({
      periodKey: 'summer-vacation',
      start: '2026-07-20',
      end: '2026-08-31',
    });
    expect(resolveDefaultStudyPeriodRange(options, '20260512')).toEqual({
      periodKey: 'sem1-r1-exam',
      start: '2026-05-10',
      end: '2026-05-14',
    });
    expect(resolveDefaultStudyPeriodRange(options, '20230101')).toBeNull();
  });

  it('resolves the previous study period option by sorted start date', () => {
    const options = buildStudyPeriodRangeOptions({
      vacationPeriodSettings: fullVacationSettings,
      examRoundPreview: fullExamPreview,
      examPrepWeeksByRound: createDefaultExamPrepWeeksByRound(4),
    });

    expect(resolvePreviousStudyPeriodOption(options, 'sem1-r1-exam')?.key).toBe(
      'sem1-r1-prep'
    );
    expect(resolvePreviousStudyPeriodOption(options, '')).toBeNull();
  });

  it('resolves the previous matching kind period for fair comparison', () => {
    const options = buildStudyPeriodRangeOptions({
      vacationPeriodSettings: fullVacationSettings,
      examRoundPreview: fullExamPreview,
      examPrepWeeksByRound: createDefaultExamPrepWeeksByRound(4),
    });

    expect(resolvePreviousMatchingStudyPeriodOption(options, 'sem1-r2-prep')?.key).toBe(
      'sem1-r1-prep'
    );
    expect(resolvePreviousMatchingStudyPeriodOption(options, 'sem1-r1-exam')).toBeNull();
    expect(
      resolvePreviousMatchingStudyPeriodOption(options, 'summer-vacation')?.key
    ).toBe('winter-vacation');
    expect(
      resolvePreviousMatchingStudyPeriodOption(
        options,
        'regular-after-sem1-r1-before-sem1-r2'
      )?.key
    ).toBe('regular-after-winter-before-sem1-r1');
  });

  it('resolves current period from manual range when it matches a preset option', () => {
    const options = buildStudyPeriodRangeOptions({
      vacationPeriodSettings: fullVacationSettings,
      examRoundPreview: fullExamPreview,
      examPrepWeeksByRound: createDefaultExamPrepWeeksByRound(4),
    });

    expect(
      resolveCurrentStudyPeriodOption(options, '', '2026-07-20', '2026-08-31')?.key
    ).toBe('summer-vacation');
    expect(
      resolveCurrentStudyPeriodOption(options, 'sem1-r2-prep', '2026-05-18', '2026-07-01')?.key
    ).toBe('sem1-r2-prep');
  });
});
