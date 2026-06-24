import { describe, expect, it } from 'vitest';

import {
  resolveStudyDayDate,
  resolveStudyDayDateFromIso,
} from './schedule-time';
import { filterEventsByDate, type ExpandedStudyPlanTodoEvent } from './study-plan-todo';

describe('resolveStudyDayDate', () => {
  it('keeps the calendar date at or after 05:00', () => {
    expect(resolveStudyDayDate('2026-06-12', '05:00')).toBe('2026-06-12');
    expect(resolveStudyDayDate('2026-06-12', '16:00')).toBe('2026-06-12');
    expect(resolveStudyDayDate('2026-06-12', '23:00')).toBe('2026-06-12');
  });

  it('maps early-morning wall clock to the previous study day', () => {
    expect(resolveStudyDayDate('2026-06-13', '00:00')).toBe('2026-06-12');
    expect(resolveStudyDayDate('2026-06-13', '01:30')).toBe('2026-06-12');
    expect(resolveStudyDayDate('2026-06-13', '04:00')).toBe('2026-06-12');
  });
});

describe('resolveStudyDayDateFromIso', () => {
  it('resolves cross-midnight starts to the study day of the evening portion', () => {
    expect(resolveStudyDayDateFromIso('2026-06-12T23:00:00')).toBe('2026-06-12');
    expect(resolveStudyDayDateFromIso('2026-06-13T02:00:00')).toBe('2026-06-12');
  });
});

describe('filterEventsByDate', () => {
  const crossMidnightEvent: ExpandedStudyPlanTodoEvent = {
    id: 'study-plan-1-2026-06-12',
    todoId: 1,
    subject: 'math',
    title: '밤 공부',
    start: '2026-06-12T23:00:00',
    end: '2026-06-13T02:00:00',
    date: '2026-06-12',
    recurrenceType: 'once',
    hasOverride: false,
  };

  const earlyMorningEvent: ExpandedStudyPlanTodoEvent = {
    id: 'study-plan-2-2026-06-13',
    todoId: 2,
    subject: 'english',
    title: '새벽 공부',
    start: '2026-06-13T01:00:00',
    end: '2026-06-13T02:00:00',
    date: '2026-06-13',
    recurrenceType: 'once',
    hasOverride: false,
  };

  it('groups cross-midnight and early-morning events under the same study day', () => {
    const events = [crossMidnightEvent, earlyMorningEvent];

    expect(filterEventsByDate(events, '2026-06-12')).toEqual([
      crossMidnightEvent,
      earlyMorningEvent,
    ]);
    expect(filterEventsByDate(events, '2026-06-13')).toEqual([]);
  });
});
