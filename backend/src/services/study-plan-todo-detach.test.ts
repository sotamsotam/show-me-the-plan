import { describe, expect, it } from 'vitest';

import {
  buildDetachedOnceTodoCreateData,
  buildParentOccurrenceDetachUpdate,
  type StudyPlanTodoRecord,
  validateOccurrenceDetachInput,
} from './study-plan-todo';

function makeWeeklyTodo(
  partial: Partial<StudyPlanTodoRecord> = {}
): StudyPlanTodoRecord {
  return {
    id: 1,
    subject: 'korean',
    title: '교과서 단권화 정리',
    startTime: '13:50',
    endTime: '14:50',
    recurrenceType: 'weekly',
    daysOfWeek: [4],
    validFrom: '2026-07-01',
    validUntil: '2026-08-31',
    date: null,
    excludedDates: [],
    overrides: {},
    executionRecords: {},
    weeklyPlanSource: null,
    ...partial,
  };
}

describe('study-plan-todo detach', () => {
  it('rejects detach to the same date', () => {
    const todo = makeWeeklyTodo();

    expect(
      validateOccurrenceDetachInput(todo, '2026-07-02', {
        toDate: '2026-07-02',
        title: todo.title,
        startTime: '14:00',
        endTime: '15:00',
      })
    ).toContain('같은 날짜');
  });

  it('allows detach to a date that already has a series occurrence', () => {
    const todo = makeWeeklyTodo();

    expect(
      validateOccurrenceDetachInput(todo, '2026-07-02', {
        toDate: '2026-07-09',
        title: todo.title,
        startTime: '14:00',
        endTime: '15:00',
      })
    ).toBeNull();
  });

  it('excludes source date and clears weeklyPlanSource on parent update', () => {
    const todo = makeWeeklyTodo({
      weeklyPlanSource: {
        kind: 'exam-prep',
        roundSlot: 'mid',
        weekNumber: 2,
        subjectId: 'korean',
        itemId: 'item-1',
      },
      overrides: {
        '2026-07-02': {
          title: '수정 제목',
          startTime: '14:00',
          endTime: '15:00',
        },
      },
    });

    const update = buildParentOccurrenceDetachUpdate(todo, '2026-07-02');

    expect(update.excludedDates).toEqual(['2026-07-02']);
    expect(update.overrides).toEqual({});
    expect(update.weeklyPlanSource).toBeNull();
  });

  it('migrates execution record to detached once todo', () => {
    const todo = makeWeeklyTodo({
      executionRecords: {
        '2026-07-02': {
          status: 'partial',
          executedStartTime: '14:00',
          executedEndTime: '14:30',
          inputMode: 'timer',
          achievementLevel: 7,
        },
      },
    });

    const onceData = buildDetachedOnceTodoCreateData(todo, '2026-07-02', {
      toDate: '2026-07-05',
      title: todo.title,
      startTime: '15:00',
      endTime: '16:00',
    });

    expect(onceData.recurrenceType).toBe('once');
    expect(onceData.date).toBe('2026-07-05');
    expect(onceData.executionRecords).toEqual({
      '2026-07-05': {
        status: 'partial',
        executedStartTime: '14:00',
        executedEndTime: '14:30',
        inputMode: 'timer',
        achievementLevel: 7,
      },
    });
  });
});
