import { describe, expect, it } from 'vitest';

import {
  buildNeisVacationSuggestions,
  buildVacationPeriodPreviewFromSettings,
  migrateLegacyVacationWeeklyPlanKey,
  resolveVacationPeriodSettings,
  validateVacationPeriodSettingsInput,
} from './vacation-period-settings';
import {
  resolveVacationWeeklyPlans,
  validateVacationWeeklyPlansInput,
} from './vacation-weekly-plan';

describe('buildNeisVacationSuggestions', () => {
  it('suggests summer and winter ranges from NEIS markers', () => {
    expect(
      buildNeisVacationSuggestions(
        [
          { date: '20260120', title: '겨울방학' },
          { date: '20260210', title: '개학' },
          { date: '20260720', title: '여름방학' },
          { date: '20260818', title: '2학기 개학' },
        ],
        '20260215'
      )
    ).toEqual({
      summer: { start: '20260720', end: '20260817' },
      winter: { start: '20260120', end: '20260209' },
    });
  });

  it('prefers upcoming December winter vacation over past January winter', () => {
    expect(
      buildNeisVacationSuggestions(
        [
          { date: '20260120', title: '겨울방학' },
          { date: '20260210', title: '개학' },
          { date: '20261220', title: '겨울방학' },
          { date: '20270228', title: '개학' },
        ],
        '20260617'
      )
    ).toEqual({
      summer: null,
      winter: { start: '20261220', end: '20270227' },
    });
  });

  it('does not attach a distant 개학 as winter end when only December break is known', () => {
    expect(
      buildNeisVacationSuggestions(
        [
          { date: '20260120', title: '겨울방학' },
          { date: '20260210', title: '개학' },
          { date: '20261230', title: '겨울방학' },
          { date: '20260818', title: '2학기 개학' },
        ],
        '20260617'
      )
    ).toEqual({
      summer: null,
      winter: { start: '20261230' },
    });
  });

  it('returns partial suggestions when only a start marker exists', () => {
    expect(
      buildNeisVacationSuggestions([{ date: '20260720', title: '여름방학' }])
    ).toEqual({
      summer: { start: '20260720' },
      winter: null,
    });
  });

  it('returns null winter when only past winter exists during mid-year', () => {
    expect(
      buildNeisVacationSuggestions(
        [
          { date: '20260203', title: '겨울방학' },
          { date: '20260210', title: '개학' },
        ],
        '20260624'
      )
    ).toEqual({
      summer: null,
      winter: null,
    });
  });

  it('selects next-year January winter start during mid-year when December is missing', () => {
    expect(
      buildNeisVacationSuggestions(
        [
          { date: '20260203', title: '겨울방학' },
          { date: '20260210', title: '개학' },
          { date: '20270120', title: '겨울방학' },
          { date: '20270228', title: '개학' },
        ],
        '20260624'
      )
    ).toEqual({
      summer: null,
      winter: { start: '20270120', end: '20270227' },
    });
  });
});

describe('validateVacationPeriodSettingsInput', () => {
  it('accepts valid summer and winter settings', () => {
    const result = validateVacationPeriodSettingsInput({
      summer: { start: '20260720', end: '20260817' },
      winter: null,
    });

    expect(result).toEqual({
      settings: {
        summer: { start: '20260720', end: '20260817' },
        winter: null,
      },
    });
  });

  it('rejects invalid date ranges', () => {
    expect(
      validateVacationPeriodSettingsInput({
        summer: { start: '20260817', end: '20260720' },
      })
    ).toEqual({
      error: '여름방학 시작일과 종료일을 올바르게 입력해 주세요.',
    });
  });
});

describe('buildVacationPeriodPreviewFromSettings', () => {
  it('builds preview items only for configured slots', () => {
    expect(
      buildVacationPeriodPreviewFromSettings({
        summer: { start: '20260720', end: '20260817' },
        winter: null,
      })
    ).toEqual([
      {
        slot: 'summer',
        periodKey: 'summer',
        label: '여름방학',
        start: '20260720',
        end: '20260817',
        hasSchedule: true,
        weekCount: 5,
      },
    ]);
  });
});

describe('resolveVacationWeeklyPlans migration', () => {
  it('maps legacy yyyymmdd keys to summer or winter slots', () => {
    expect(
      resolveVacationWeeklyPlans({
        '20260720': {
          weeks: {
            '1': { math: '복습' },
          },
        },
        winter: {
          weeks: {
            '2': { korean: '독서' },
          },
        },
      })
    ).toEqual({
      summer: {
        weeks: {
          '1': { math: '복습' },
        },
      },
      winter: {
        weeks: {
          '2': { korean: '독서' },
        },
      },
    });
  });

  it('validates plans against settings-based preview', () => {
    const preview = buildVacationPeriodPreviewFromSettings(
      resolveVacationPeriodSettings({
        summer: { start: '20260720', end: '20260817' },
        winter: null,
      })
    );

    expect(
      validateVacationWeeklyPlansInput(
        {
          summer: {
            weeks: {
              '1': { math: '단원 정리' },
            },
          },
        },
        {
          allowedSubjectIds: new Set(['math']),
          vacationPeriodPreview: preview,
        }
      )
    ).toEqual({
      plans: {
        summer: {
          weeks: {
            '1': { math: '단원 정리' },
          },
        },
      },
    });
  });

  it('migrates legacy keys through migrateLegacyVacationWeeklyPlanKey', () => {
    expect(migrateLegacyVacationWeeklyPlanKey('20260720')).toBe('summer');
    expect(migrateLegacyVacationWeeklyPlanKey('20260120')).toBe('winter');
    expect(migrateLegacyVacationWeeklyPlanKey('summer')).toBe('summer');
  });
});
