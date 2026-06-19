import { describe, expect, it } from 'vitest';

import { buildExamRoundPreview, groupExamEvents } from './exam-countdown';
import {
  buildNeisExamSuggestionsFromPreview,
  resolveEffectiveExamRoundPreview,
  resolveExamPeriodSettings,
  validateExamPeriodSettingsInput,
} from './exam-period-settings';

describe('buildNeisExamSuggestionsFromPreview', () => {
  it('builds suggestions from NEIS exam round preview', () => {
    const preview = buildExamRoundPreview([
      {
        label: '1학기 중간고사',
        firstDay: '20260420',
        lastDay: '20260424',
        roundSlot: 'sem1-r1',
      },
    ]);

    expect(buildNeisExamSuggestionsFromPreview(preview)).toEqual({
      'sem1-r1': {
        start: '20260420',
        end: '20260424',
        label: '1학기 중간고사',
      },
      'sem1-r2': null,
      'sem2-r1': null,
      'sem2-r2': null,
    });
  });

  it('returns empty suggestions when preview has no schedule', () => {
    expect(buildNeisExamSuggestionsFromPreview(buildExamRoundPreview([]))).toEqual({
      'sem1-r1': null,
      'sem1-r2': null,
      'sem2-r1': null,
      'sem2-r2': null,
    });
  });
});

describe('validateExamPeriodSettingsInput', () => {
  it('accepts valid settings for configured slots', () => {
    const result = validateExamPeriodSettingsInput({
      'sem1-r1': { start: '20260420', end: '20260424' },
      'sem1-r2': null,
    });

    expect(result).toEqual({
      settings: {
        'sem1-r1': { start: '20260420', end: '20260424' },
        'sem1-r2': null,
        'sem2-r1': null,
        'sem2-r2': null,
      },
    });
  });

  it('rejects invalid date ranges', () => {
    expect(
      validateExamPeriodSettingsInput({
        'sem1-r1': { start: '20260424', end: '20260420' },
      })
    ).toEqual({
      error: '1학기 1회차 시험 시작일과 종료일을 올바르게 입력해 주세요.',
    });
  });

  it('rejects exam periods longer than 14 days', () => {
    expect(
      validateExamPeriodSettingsInput({
        'sem1-r1': { start: '20260401', end: '20260420' },
      })
    ).toEqual({
      error: '1학기 1회차 시험 시작일과 종료일을 올바르게 입력해 주세요.',
    });
  });

  it('rejects unknown slot keys', () => {
    expect(
      validateExamPeriodSettingsInput({
        'sem3-r1': { start: '20260420', end: '20260424' },
      })
    ).toEqual({
      error: '지원하지 않는 시험 회차입니다: sem3-r1',
    });
  });
});

describe('resolveExamPeriodSettings', () => {
  it('normalizes partial stored values and ignores invalid slots', () => {
    expect(
      resolveExamPeriodSettings({
        'sem1-r1': { start: '20260420', end: '20260424' },
        'sem1-r2': { start: 'invalid', end: '20260501' },
      })
    ).toEqual({
      'sem1-r1': { start: '20260420', end: '20260424' },
      'sem1-r2': null,
      'sem2-r1': null,
      'sem2-r2': null,
    });
  });
});

describe('resolveEffectiveExamRoundPreview', () => {
  const neisPreview = buildExamRoundPreview(
    groupExamEvents([
      { date: '20260420', title: '1학기 중간고사 1일차' },
      { date: '20260421', title: '1학기 중간고사 2일차' },
      { date: '20260615', title: '1학기 기말고사 1일차' },
      { date: '20260616', title: '1학기 기말고사 2일차' },
    ]).map((group, index) => ({
      ...group,
      roundSlot: (index === 0 ? 'sem1-r1' : 'sem1-r2') as 'sem1-r1' | 'sem1-r2',
    }))
  );

  it('prefers saved settings over NEIS preview', () => {
    const effective = resolveEffectiveExamRoundPreview(
      resolveExamPeriodSettings({
        'sem1-r1': { start: '20260425', end: '20260426' },
      }),
      neisPreview
    );

    expect(effective.find((item) => item.slot === 'sem1-r1')).toEqual({
      slot: 'sem1-r1',
      label: neisPreview.find((item) => item.slot === 'sem1-r1')?.label ?? null,
      firstDay: '20260425',
      lastDay: '20260426',
      hasSchedule: true,
    });
  });

  it('falls back to NEIS preview when saved settings are empty', () => {
    const effective = resolveEffectiveExamRoundPreview(
      resolveExamPeriodSettings(null),
      neisPreview
    );

    expect(effective.find((item) => item.slot === 'sem1-r1')).toEqual(
      neisPreview.find((item) => item.slot === 'sem1-r1')
    );
  });

  it('marks slots without saved or NEIS data as unavailable', () => {
    const effective = resolveEffectiveExamRoundPreview(
      resolveExamPeriodSettings(null),
      buildExamRoundPreview([])
    );

    expect(effective).toEqual([
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
