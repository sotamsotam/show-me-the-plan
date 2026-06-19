import { describe, expect, it } from 'vitest';

import {
  extractSchoolClassDates,
  extractSchoolHolidayEvents,
  isDateInVacationPeriod,
  resolveVacationPeriods,
} from './school-term-periods';

describe('resolveVacationPeriods', () => {
  it('expands vacation from a 방학 marker until the day before 개학', () => {
    const periods = resolveVacationPeriods(
      [
        { date: '20260720', title: '여름방학' },
        { date: '20260818', title: '2학기 개학' },
      ],
      new Set()
    );

    expect(periods).toEqual([
      {
        label: '여름방학',
        start: '20260720',
        end: '20260817',
      },
    ]);
    expect(isDateInVacationPeriod('20260801', periods)).toBe(true);
    expect(isDateInVacationPeriod('20260818', periods)).toBe(false);
  });

  it('extends vacation through weekdays without school classes when no 개학 marker exists', () => {
    const periods = resolveVacationPeriods(
      [{ date: '20260120', title: '겨울방학' }],
      new Set(['20260210', '20260211'])
    );

    expect(periods).toHaveLength(1);
    expect(isDateInVacationPeriod('20260209', periods[0] ? [periods[0]] : [])).toBe(true);
    expect(isDateInVacationPeriod('20260210', periods[0] ? [periods[0]] : [])).toBe(false);
  });

  it('ignores non-vacation holidays such as 공휴일', () => {
    expect(
      resolveVacationPeriods([{ date: '20260606', title: '현충일' }], new Set())
    ).toEqual([]);
  });
});

describe('extractSchoolHolidayEvents', () => {
  it('reads holiday events from calendar event inputs', () => {
    expect(
      extractSchoolHolidayEvents([
        {
          title: '여름방학',
          start: '2026-07-20',
          extendedProps: { type: 'school-holiday' },
        },
        {
          title: '국어',
          start: '2026-07-21T09:00:00',
          extendedProps: { type: 'school' },
        },
      ])
    ).toEqual([{ date: '20260720', title: '여름방학' }]);
  });
});

describe('extractSchoolClassDates', () => {
  it('collects ymd dates from school timetable events', () => {
    expect(
      extractSchoolClassDates([
        {
          title: '수학',
          start: '2026-06-16T10:40:00',
          extendedProps: { type: 'school' },
        },
      ])
    ).toEqual(new Set(['20260616']));
  });
});
