import { describe, expect, it } from 'vitest';

import {
  buildSlotDateInputsFromSettingsAndSuggestions,
  isStaleSavedWinterVacation,
  shouldPreferNeisSuggestionOverSaved,
} from './vacation-period-settings';

describe('buildSlotDateInputsFromSettingsAndSuggestions', () => {
  it('prefers NEIS December winter over stale saved January winter', () => {
    const inputs = buildSlotDateInputsFromSettingsAndSuggestions(
      {
        summer: null,
        winter: { start: '20260101', end: '20260209' },
      },
      {
        summer: null,
        winter: { start: '20261230' },
      },
      '20260617'
    );

    expect(inputs.winter).toEqual({
      start: '2026-12-30',
      end: '',
    });
  });

  it('keeps saved winter when it matches the current season', () => {
    const inputs = buildSlotDateInputsFromSettingsAndSuggestions(
      {
        summer: null,
        winter: { start: '20260120', end: '20260209' },
      },
      {
        summer: null,
        winter: { start: '20261230' },
      },
      '20260201'
    );

    expect(inputs.winter).toEqual({
      start: '2026-01-20',
      end: '2026-02-09',
    });
  });

  it('leaves end empty when NEIS only provides a winter start date', () => {
    const inputs = buildSlotDateInputsFromSettingsAndSuggestions(
      {
        summer: null,
        winter: null,
      },
      {
        summer: null,
        winter: { start: '20261230' },
      },
      '20260617'
    );

    expect(inputs.winter.end).toBe('');
  });

  it('clears stale saved winter during mid-year when NEIS has no upcoming winter', () => {
    const inputs = buildSlotDateInputsFromSettingsAndSuggestions(
      {
        summer: null,
        winter: { start: '20260203', end: '20260228' },
      },
      {
        summer: null,
        winter: null,
      },
      '20260624'
    );

    expect(inputs.winter).toEqual({
      start: '',
      end: '',
    });
  });
});

describe('shouldPreferNeisSuggestionOverSaved', () => {
  it('detects stale January saved winter during mid-year planning', () => {
    expect(
      shouldPreferNeisSuggestionOverSaved(
        'winter',
        { start: '20260101', end: '20260209' },
        { start: '20261230' },
        '20260617'
      )
    ).toBe(true);
  });
});

describe('isStaleSavedWinterVacation', () => {
  it('treats ended winter as stale during mid-year', () => {
    expect(
      isStaleSavedWinterVacation(
        { start: '20260203', end: '20260228' },
        '20260624'
      )
    ).toBe(true);
  });

  it('keeps current winter during January', () => {
    expect(
      isStaleSavedWinterVacation(
        { start: '20260120', end: '20260209' },
        '20260201'
      )
    ).toBe(false);
  });
});
