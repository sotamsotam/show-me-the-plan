import { describe, expect, it } from 'vitest';

import {
  buildFindInRangeResponse,
  buildTodoOverlapWhereClause,
  collectStudyPlanTodoTitles,
  filterExcludedDatesInRange,
  filterRecordMapByDateRange,
  filterTitlesByQuery,
  isDateInApiRange,
  parseStudyPlanFindInclude,
  serializeStudyPlanTodo,
  todoOverlapsRange,
  toStudyPlanTodoRecord,
} from './study-plan-todo';

describe('study-plan-todo range filter', () => {
  it('isDateInApiRange uses [start, end) semantics', () => {
    expect(isDateInApiRange('2026-06-01', '2026-06-01', '2026-06-08')).toBe(true);
    expect(isDateInApiRange('2026-06-07', '2026-06-01', '2026-06-08')).toBe(true);
    expect(isDateInApiRange('2026-06-08', '2026-06-01', '2026-06-08')).toBe(false);
    expect(isDateInApiRange('2026-05-31', '2026-06-01', '2026-06-08')).toBe(false);
  });

  it('filterRecordMapByDateRange keeps only in-range keys', () => {
    const filtered = filterRecordMapByDateRange(
      {
        '2026-05-30': { status: 'completed' as const },
        '2026-06-03': { status: 'completed' as const },
        '2026-06-10': { status: 'incomplete' as const },
      },
      '2026-06-01',
      '2026-06-08'
    );

    expect(Object.keys(filtered)).toEqual(['2026-06-03']);
  });

  it('filterExcludedDatesInRange keeps only in-range dates', () => {
    expect(
      filterExcludedDatesInRange(
        ['2026-05-01', '2026-06-05', '2026-06-08'],
        '2026-06-01',
        '2026-06-08'
      )
    ).toEqual(['2026-06-05']);
  });

  it('serializeStudyPlanTodo without range returns full JSON fields', () => {
    const todo = serializeStudyPlanTodo({
      id: 1,
      subject: 'math',
      title: '단원 복습',
      startTime: '16:00',
      endTime: '18:00',
      recurrenceType: 'weekly',
      daysOfWeek: [1],
      validFrom: '2026-01-01',
      validUntil: '2026-12-31',
      date: null,
      excludedDates: ['2026-05-01', '2026-06-05'],
      overrides: {
        '2026-06-03': { title: '보충', startTime: '17:00', endTime: '19:00' },
      },
      executionRecords: {
        '2026-05-30': { status: 'incomplete' },
        '2026-06-03': {
          status: 'completed',
          executedStartTime: '16:00',
          executedEndTime: '17:00',
          inputMode: 'direct',
          achievementLevel: 7,
        },
      },
    });

    expect(todo.excludedDates).toEqual(['2026-05-01', '2026-06-05']);
    expect(Object.keys(todo.overrides)).toEqual(['2026-06-03']);
    expect(Object.keys(todo.executionRecords)).toEqual(['2026-05-30', '2026-06-03']);
  });

  it('serializeStudyPlanTodo with range filters date-keyed fields only', () => {
    const todo = serializeStudyPlanTodo(
      {
        id: 1,
        subject: 'math',
        title: '단원 복습',
        startTime: '16:00',
        endTime: '18:00',
        recurrenceType: 'weekly',
        daysOfWeek: [1],
        validFrom: '2026-01-01',
        validUntil: '2026-12-31',
        date: null,
        excludedDates: ['2026-05-01', '2026-06-05'],
        overrides: {
          '2026-06-03': { title: '보충', startTime: '17:00', endTime: '19:00' },
          '2026-07-01': { title: '여름', startTime: '10:00', endTime: '12:00' },
        },
        executionRecords: {
          '2026-05-30': { status: 'incomplete' },
          '2026-06-03': {
            status: 'completed',
            executedStartTime: '16:00',
            executedEndTime: '17:00',
            inputMode: 'direct',
            achievementLevel: 8,
          },
          '2026-06-09': { status: 'incomplete' },
        },
      },
      { start: '2026-06-01', end: '2026-06-08' }
    );

    expect(todo.title).toBe('단원 복습');
    expect(todo.validFrom).toBe('2026-01-01');
    expect(todo.excludedDates).toEqual(['2026-06-05']);
    expect(Object.keys(todo.overrides)).toEqual(['2026-06-03']);
    expect(Object.keys(todo.executionRecords)).toEqual(['2026-06-03']);
  });
});

describe('study-plan-todo find include', () => {
  const sampleTodo = serializeStudyPlanTodo(
    {
      id: 1,
      subject: 'math',
      title: '복습',
      startTime: '16:00',
      endTime: '18:00',
      recurrenceType: 'once',
      daysOfWeek: [],
      validFrom: null,
      validUntil: null,
      date: '2026-06-03',
      excludedDates: [],
      overrides: {},
      executionRecords: {
        '2026-06-03': { status: 'incomplete' },
      },
    },
    { start: '2026-06-01', end: '2026-06-08' }
  );

  const sampleEvents = [
    {
      id: 'study-plan-1-2026-06-03',
      todoId: 1,
      subject: 'math' as const,
      title: '복습',
      start: '2026-06-03T16:00:00',
      end: '2026-06-03T18:00:00',
      date: '2026-06-03',
      recurrenceType: 'once' as const,
      hasOverride: false,
    },
  ];

  it('parseStudyPlanFindInclude defaults to all sections', () => {
    expect(parseStudyPlanFindInclude(undefined)).toEqual([
      'events',
      'meta',
      'executions',
    ]);
  });

  it('parseStudyPlanFindInclude rejects unknown values', () => {
    expect(parseStudyPlanFindInclude('events,foo')).toEqual({
      error: 'include는 events, meta, executions 중에서만 지정할 수 있습니다.',
    });
  });

  it('parseStudyPlanFindInclude requires meta when executions is requested', () => {
    expect(parseStudyPlanFindInclude('events,executions')).toEqual({
      error: 'executions를 포함하려면 meta도 포함해야 합니다.',
    });
  });

  it('buildFindInRangeResponse omits executionRecords when executions is excluded', () => {
    const response = buildFindInRangeResponse(
      ['events', 'meta'],
      [sampleTodo],
      sampleEvents
    );

    expect(response.events).toEqual(sampleEvents);
    expect(response.todos?.[0].executionRecords).toEqual({});
  });

  it('buildFindInRangeResponse can return events only', () => {
    const response = buildFindInRangeResponse(['events'], [sampleTodo], sampleEvents);

    expect(response.events).toEqual(sampleEvents);
    expect(response.todos).toBeUndefined();
  });
});

describe('study-plan-todo overlap query', () => {
  it('todoOverlapsRange matches once and weekly rules', () => {
    const onceInRange = toStudyPlanTodoRecord({
      id: 1,
      subject: 'math',
      title: '1회',
      startTime: '16:00',
      endTime: '18:00',
      recurrenceType: 'once',
      daysOfWeek: [],
      date: '2026-06-03',
      excludedDates: [],
      overrides: {},
      executionRecords: {},
    });
    const onceOutOfRange = toStudyPlanTodoRecord({
      ...onceInRange,
      id: 2,
      date: '2026-06-08',
    });
    const weeklyInRange = toStudyPlanTodoRecord({
      id: 3,
      subject: 'math',
      title: '매주',
      startTime: '16:00',
      endTime: '18:00',
      recurrenceType: 'weekly',
      daysOfWeek: [1],
      validFrom: '2026-01-01',
      validUntil: '2026-12-31',
      date: null,
      excludedDates: [],
      overrides: {},
      executionRecords: {},
    });
    const weeklyEnded = toStudyPlanTodoRecord({
      ...weeklyInRange,
      id: 4,
      validUntil: '2026-05-31',
    });

    expect(todoOverlapsRange(onceInRange, '2026-06-01', '2026-06-08')).toBe(true);
    expect(todoOverlapsRange(onceOutOfRange, '2026-06-01', '2026-06-08')).toBe(false);
    expect(todoOverlapsRange(weeklyInRange, '2026-06-01', '2026-06-08')).toBe(true);
    expect(todoOverlapsRange(weeklyEnded, '2026-06-01', '2026-06-08')).toBe(false);
  });

  it('buildTodoOverlapWhereClause scopes by user and range', () => {
    expect(buildTodoOverlapWhereClause(7, '2026-06-01', '2026-06-08')).toEqual({
      user: 7,
      $or: [
        {
          recurrenceType: 'once',
          date: { $gte: '2026-06-01', $lt: '2026-06-08' },
        },
        {
          recurrenceType: 'weekly',
          validFrom: { $lt: '2026-06-08' },
          validUntil: { $gte: '2026-06-01' },
        },
      ],
    });
  });
});

describe('study-plan-todo titles', () => {
  const sampleTodos = [
    toStudyPlanTodoRecord({
      id: 1,
      subject: 'english',
      title: '능률보카',
      startTime: '16:00',
      endTime: '18:00',
      recurrenceType: 'weekly',
      daysOfWeek: [1],
      validFrom: '2026-01-01',
      validUntil: '2026-12-31',
      date: null,
      excludedDates: [],
      overrides: {
        '2026-06-03': { title: '능률보카 day3', startTime: '16:00', endTime: '18:00' },
      },
      executionRecords: {},
    }),
    toStudyPlanTodoRecord({
      id: 2,
      subject: 'math',
      title: '능률보카',
      startTime: '16:00',
      endTime: '18:00',
      recurrenceType: 'once',
      daysOfWeek: [],
      date: '2026-06-04',
      excludedDates: [],
      overrides: {},
      executionRecords: {},
    }),
  ];

  it('collectStudyPlanTodoTitles deduplicates base and override titles', () => {
    const titles = collectStudyPlanTodoTitles(sampleTodos);

    expect(titles).toEqual(['능률보카', '능률보카 day3']);
  });

  it('collectStudyPlanTodoTitles filters by subject', () => {
    expect(collectStudyPlanTodoTitles(sampleTodos, 'english')).toEqual([
      '능률보카',
      '능률보카 day3',
    ]);
    expect(collectStudyPlanTodoTitles(sampleTodos, 'math')).toEqual(['능률보카']);
  });

  it('filterTitlesByQuery matches substring', () => {
    const titles = ['능률보카', '능률보카 day3', '수학 기출'];

    expect(filterTitlesByQuery(titles, '능')).toEqual(['능률보카', '능률보카 day3']);
    expect(filterTitlesByQuery(titles, '')).toEqual(titles);
  });
});
