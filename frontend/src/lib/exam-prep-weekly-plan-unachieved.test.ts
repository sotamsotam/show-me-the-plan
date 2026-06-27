import { describe, expect, it } from 'vitest';

import { createDefaultExamPrepWeeksByRound } from './exam-countdown';
import { resolveExamPrepWeeklyPlans } from './exam-prep-weekly-plan';
import {
  carryOverExamPrepWeeklyPlanItem,
  deleteExamPrepWeeklyPlanItem,
  resolveDefaultCarryOverWeek,
  resolveUnachievedWeeklyPlanItems,
} from './exam-prep-weekly-plan-unachieved';
import type { StudyPlanTodo } from './study-plan-todo';

const examPrepWeeksByRound = createDefaultExamPrepWeeksByRound(4);

function buildTodo(partial: Partial<StudyPlanTodo> & Pick<StudyPlanTodo, 'id'>): StudyPlanTodo {
  return {
    id: partial.id,
    subject: partial.subject ?? 'math',
    title: partial.title ?? '복습',
    startTime: partial.startTime ?? '14:00',
    endTime: partial.endTime ?? '15:00',
    recurrenceType: partial.recurrenceType ?? 'once',
    daysOfWeek: partial.daysOfWeek ?? [],
    validFrom: partial.validFrom ?? null,
    validUntil: partial.validUntil ?? null,
    date: partial.date ?? '2026-05-12',
    excludedDates: partial.excludedDates ?? [],
    overrides: partial.overrides ?? {},
    executionRecords: partial.executionRecords ?? {},
    weeklyPlanSource: partial.weeklyPlanSource ?? null,
  };
}

describe('resolveUnachievedWeeklyPlanItems', () => {
  const plans = resolveExamPrepWeeklyPlans({
    'sem1-r2': {
      weeks: {
        '2': {
          math: [{ id: 'item-1', title: '2단원', scheduledTodoId: 10 }],
        },
      },
    },
  });

  it('includes incomplete execution records', () => {
    const todos = [
      buildTodo({
        id: 10,
        executionRecords: {
          '2026-05-12': { status: 'incomplete' },
        },
      }),
    ];

    expect(resolveUnachievedWeeklyPlanItems(plans, todos, '2026-05-13')).toEqual([
      expect.objectContaining({
        todoId: 10,
        reason: 'incomplete',
        item: { id: 'item-1', title: '2단원', scheduledTodoId: 10 },
      }),
    ]);
  });

  it('includes overdue unexecuted todos', () => {
    const todos = [buildTodo({ id: 10, date: '2026-05-10' })];

    expect(resolveUnachievedWeeklyPlanItems(plans, todos, '2026-05-13')).toEqual([
      expect.objectContaining({
        todoId: 10,
        reason: 'overdue_unexecuted',
      }),
    ]);
  });

  it('excludes completed todos', () => {
    const todos = [
      buildTodo({
        id: 10,
        executionRecords: {
          '2026-05-12': { status: 'completed', achievementLevel: 8 },
        },
      }),
    ];

    expect(resolveUnachievedWeeklyPlanItems(plans, todos, '2026-05-13')).toEqual([]);
  });
});

describe('carryOverExamPrepWeeklyPlanItem', () => {
  it('moves a scheduled item to another week as unscheduled', () => {
    const plans = resolveExamPrepWeeklyPlans({
      'sem1-r2': {
        weeks: {
          '2': {
            math: [{ id: 'item-1', title: '2단원', scheduledTodoId: 10 }],
          },
        },
      },
    });

    const result = carryOverExamPrepWeeklyPlanItem(plans, {
      roundSlot: 'sem1-r2',
      weekNumber: 2,
      subjectId: 'math',
      itemId: 'item-1',
      toWeek: 3,
    });

    expect(result).toEqual({
      plans: resolveExamPrepWeeklyPlans({
        'sem1-r2': {
          weeks: {
            '3': {
              math: [{ id: 'item-1', title: '2단원' }],
            },
          },
        },
      }),
    });
  });
});

describe('deleteExamPrepWeeklyPlanItem', () => {
  it('removes the item and returns linked todo id', () => {
    const plans = resolveExamPrepWeeklyPlans({
      'sem1-r2': {
        weeks: {
          '2': {
            math: [{ id: 'item-1', title: '2단원', scheduledTodoId: 10 }],
          },
        },
      },
    });

    expect(
      deleteExamPrepWeeklyPlanItem(plans, {
        roundSlot: 'sem1-r2',
        weekNumber: 2,
        subjectId: 'math',
        itemId: 'item-1',
      })
    ).toEqual({
      plans: {},
      scheduledTodoId: 10,
    });
  });
});

describe('resolveDefaultCarryOverWeek', () => {
  it('returns the next week when within range', () => {
    expect(resolveDefaultCarryOverWeek(2, examPrepWeeksByRound, 'sem1-r2')).toBe(3);
  });

  it('returns null when next week exceeds configured weeks', () => {
    expect(resolveDefaultCarryOverWeek(4, examPrepWeeksByRound, 'sem1-r2')).toBeNull();
  });
});
