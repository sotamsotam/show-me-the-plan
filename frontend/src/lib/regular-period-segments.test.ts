import { describe, expect, it } from 'vitest';
import { createDefaultExamPrepWeeksByRound } from '@/lib/exam-countdown';
import {
  buildRegularPeriodSegmentPreview,
  REGULAR_PERIOD_SEGMENT_LABELS,
} from '@/lib/regular-period-segments';
import type { VacationPeriodSettings } from '@/lib/vacation-period-settings';
import type { ExamRoundPreviewItem } from '@/lib/exam-countdown';

function buildPreview(
  vacationPeriodSettings: VacationPeriodSettings,
  examRoundPreview: ExamRoundPreviewItem[]
) {
  return buildRegularPeriodSegmentPreview({
    vacationPeriodSettings,
    examRoundPreview,
    examPrepWeeksByRound: createDefaultExamPrepWeeksByRound(4),
  });
}

describe('buildRegularPeriodSegmentPreview', () => {
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

  it('creates after-summer-before-sem2-r1 segment starting the day after vacation ends', () => {
    const segments = buildPreview(fullVacationSettings, fullExamPreview);
    const target = segments.find((item) => item.periodKey === 'after-summer-before-sem2-r1');

    expect(target).toBeDefined();
    expect(target?.label).toBe(REGULAR_PERIOD_SEGMENT_LABELS['after-summer-before-sem2-r1']);
    expect(target?.start).toBe('20260901');
    expect(target?.end && target.end < '20261110').toBe(true);
    expect(target?.weekCount).toBeGreaterThan(0);
  });

  it('excludes vacation, exam prep, and exam week from regular segments', () => {
    const segments = buildPreview(fullVacationSettings, fullExamPreview);

    for (const segment of segments) {
      expect(segment.start).not.toBe('20260720');
      expect(segment.end).not.toBe('20260831');
      expect(
        segment.start > '20260831' || segment.end < '20260720'
      ).toBe(true);
    }
  });

  it('returns no segments when vacation and exam settings are missing', () => {
    expect(
      buildPreview(
        { summer: null, winter: null },
        fullExamPreview.map((item) => ({ ...item, hasSchedule: false, firstDay: null, lastDay: null }))
      )
    ).toEqual([]);
  });

  it('uses fallback gap key when intermediate exam round is missing', () => {
    const partialExamPreview = fullExamPreview.filter((item) => item.slot !== 'sem1-r1');
    const segments = buildPreview(fullVacationSettings, partialExamPreview);
    const fallback = segments.find((item) => item.periodKey.startsWith('gap-'));

    expect(fallback).toBeDefined();
  });
});
