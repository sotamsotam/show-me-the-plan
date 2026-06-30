import { describe, expect, it } from 'vitest';

import {
  createDefaultExamPrepWeeksByRound,
  resolveActiveExamCountdownFromPreview,
  resolveExamPrepPeriodsFromPreview,
  resolveNearestScheduledRoundSlot,
} from './exam-countdown';
import { buildExamPrepWeeklyPlanEvents } from './exam-prep-weekly-plan-events';
import {
  resolveEffectiveExamRoundPreview,
  resolveExamPeriodSettings,
  validateExamPeriodSettingsInput,
} from './exam-period-settings';
import { resolveExamPrepWeeklyPlansContext } from './exam-prep-weekly-plans-context';
import { resolveVisiblePrepWeekPlans } from './exam-prep-visible-week-plans';

const NEIS_PREVIEW = [
  {
    slot: 'sem1-r1' as const,
    label: '1학기 중간고사',
    firstDay: '20260420',
    lastDay: '20260424',
    hasSchedule: true,
  },
  {
    slot: 'sem1-r2' as const,
    label: null,
    firstDay: null,
    lastDay: null,
    hasSchedule: false,
  },
  {
    slot: 'sem2-r1' as const,
    label: null,
    firstDay: null,
    lastDay: null,
    hasSchedule: false,
  },
  {
    slot: 'sem2-r2' as const,
    label: null,
    firstDay: null,
    lastDay: null,
    hasSchedule: false,
  },
];

const FULL_EMPTY_PREVIEW = NEIS_PREVIEW.map((item) =>
  item.slot === 'sem1-r1'
    ? item
    : {
        slot: item.slot,
        label: null,
        firstDay: null,
        lastDay: null,
        hasSchedule: false,
      }
);

function localDate(ymd: string): Date {
  const year = Number(ymd.slice(0, 4));
  const month = Number(ymd.slice(4, 6)) - 1;
  const day = Number(ymd.slice(6, 8));
  return new Date(year, month, day);
}

describe('exam period settings end-to-end scenarios', () => {
  const settings = createDefaultExamPrepWeeksByRound(4);

  it('scenario 1: NEIS only — effective preview and countdown use NEIS dates', () => {
    const saved = resolveExamPeriodSettings(null);
    const effective = resolveEffectiveExamRoundPreview(saved, NEIS_PREVIEW);

    expect(effective.find((item) => item.slot === 'sem1-r1')).toEqual({
      slot: 'sem1-r1',
      label: '1학기 중간고사',
      firstDay: '20260420',
      lastDay: '20260424',
      hasSchedule: true,
    });

    expect(
      resolveActiveExamCountdownFromPreview(effective, settings, '20260401')?.examDate
    ).toBe('20260420');

    expect(resolveExamPrepPeriodsFromPreview(effective, settings)).toEqual([
      {
        label: '1학기 중간고사',
        prepStart: '20260323',
        examFirstDay: '20260420',
        prepEnd: '20260424',
        roundSlot: 'sem1-r1',
      },
    ]);
  });

  it('scenario 2: saved override — manual dates replace inaccurate NEIS dates', () => {
    const saved = resolveExamPeriodSettings({
      'sem1-r1': { start: '20260425', end: '20260426' },
    });
    const effective = resolveEffectiveExamRoundPreview(saved, NEIS_PREVIEW);

    expect(effective.find((item) => item.slot === 'sem1-r1')).toMatchObject({
      firstDay: '20260425',
      lastDay: '20260426',
      hasSchedule: true,
    });

    expect(
      resolveActiveExamCountdownFromPreview(effective, settings, '20260410')?.examDate
    ).toBe('20260425');
  });

  it('scenario 3: manual only (no NEIS) — round becomes available for weekly plans', () => {
    const emptyNeisPreview = FULL_EMPTY_PREVIEW.map((item) => ({
      ...item,
      label: null,
      firstDay: null,
      lastDay: null,
      hasSchedule: false,
    }));

    const saved = resolveExamPeriodSettings({
      'sem1-r2': { start: '20260610', end: '20260612' },
    });
    const effective = resolveEffectiveExamRoundPreview(saved, emptyNeisPreview);

    expect(effective.find((item) => item.slot === 'sem1-r2')).toEqual({
      slot: 'sem1-r2',
      label: null,
      firstDay: '20260610',
      lastDay: '20260612',
      hasSchedule: true,
    });

    expect(resolveNearestScheduledRoundSlot(effective)).toBe('sem1-r2');

    const context = resolveExamPrepWeeklyPlansContext({
      examPrepWeeksBefore: 4,
      examPrepWeeksByRound: settings,
      examPrepWeeklyPlans: {
        'sem1-r2': {
          weeks: {
            '4': { korean: [{ id: 'k-1', title: '1회독' }] },
          },
        },
      },
      subjects: [{ id: 'korean', label: '국어' }],
      examRoundPreview: emptyNeisPreview,
      examPeriodSettings: saved,
    });

    const visiblePlans = resolveVisiblePrepWeekPlans(
      {
        start: localDate('20260511'),
        end: localDate('20260518'),
      },
      context
    );

    expect(visiblePlans).toHaveLength(1);
    expect(visiblePlans[0]?.roundSlot).toBe('sem1-r2');
    expect(visiblePlans[0]?.weeks[0]?.subjects[0]?.items[0]?.title).toBe('1회독');
  });

  it('scenario 4: calendar memo events use saved exam dates', () => {
    const saved = resolveExamPeriodSettings({
      'sem1-r1': { start: '20260425', end: '20260426' },
    });
    const effective = resolveEffectiveExamRoundPreview(saved, NEIS_PREVIEW);
    const events = buildExamPrepWeeklyPlanEvents({
      plans: {
        'sem1-r1': {
          weeks: {
            '4': { korean: [{ id: 'k-2', title: '교과서 정리' }] },
          },
        },
      },
      examPrepWeeksByRound: settings,
      examRoundPreview: effective,
      subjects: [{ id: 'korean', label: '국어' }],
    });

    expect(events).toHaveLength(1);
    expect(events[0]?.title).toContain('교과서 정리');
    expect(events[0]?.start).toBe('2026-03-23');
  });

  it('scenario 5: save validation rejects invalid manual ranges before persistence', () => {
    expect(
      validateExamPeriodSettingsInput({
        'sem1-r1': { start: '20260426', end: '20260420' },
      })
    ).toEqual({
      error: '1학기 1회차 (중간고사) 시험 시작일과 종료일을 올바르게 입력해 주세요.',
    });
  });
});
