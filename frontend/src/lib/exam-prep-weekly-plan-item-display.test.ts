import { describe, expect, it } from 'vitest';
import {
  removeUnscheduledWeeklyPlanItem,
  reorderUnscheduledWeeklyPlanItems,
  resolveWeeklyPlanItemRowKind,
  getWeeklyPlanItemRowSurfaceClasses,
} from '@/lib/exam-prep-weekly-plan-item-display';
import type { ExamPrepWeeklyPlanItem } from '@/lib/exam-prep-weekly-plan';
import type { StudyPlanTodo } from '@/lib/study-plan-todo';

function todo(partial: Partial<StudyPlanTodo> & Pick<StudyPlanTodo, 'id'>): StudyPlanTodo {
  return {
    subject: 'korean',
    title: '테스트',
    startTime: '16:00',
    endTime: '17:00',
    recurrenceType: 'once',
    daysOfWeek: [],
    validFrom: null,
    validUntil: null,
    date: '2026-05-10',
    excludedDates: [],
    overrides: {},
    executionRecords: {},
    ...partial,
  };
}

describe('resolveWeeklyPlanItemRowKind', () => {
  it('returns editable for unscheduled items', () => {
    const item: ExamPrepWeeklyPlanItem = { id: 'a', title: '1회독' };

    expect(resolveWeeklyPlanItemRowKind(item, new Map())).toBe('editable');
  });

  it('returns scheduled_pending when todo has no execution record', () => {
    const item: ExamPrepWeeklyPlanItem = {
      id: 'a',
      title: '1회독',
      scheduledTodoId: 10,
    };
    const todoById = new Map([[10, todo({ id: 10 })]]);

    expect(resolveWeeklyPlanItemRowKind(item, todoById)).toBe('scheduled_pending');
  });

  it('returns execution status when todo is completed', () => {
    const item: ExamPrepWeeklyPlanItem = {
      id: 'a',
      title: '1회독',
      scheduledTodoId: 10,
    };
    const todoById = new Map([
      [
        10,
        todo({
          id: 10,
          executionRecords: {
            '2026-05-10': { status: 'completed' },
          },
        }),
      ],
    ]);

    expect(resolveWeeklyPlanItemRowKind(item, todoById)).toBe('completed');
  });
});

describe('getWeeklyPlanItemRowSurfaceClasses', () => {
  it('returns distinct surface classes per row kind', () => {
    expect(getWeeklyPlanItemRowSurfaceClasses('editable')).toContain('bg-gray-50');
    expect(getWeeklyPlanItemRowSurfaceClasses('scheduled_pending')).toContain('bg-blue-50');
    expect(getWeeklyPlanItemRowSurfaceClasses('completed')).toContain('bg-green-50');
    expect(getWeeklyPlanItemRowSurfaceClasses('incomplete')).toContain('bg-red-50');
    expect(getWeeklyPlanItemRowSurfaceClasses('partial')).toContain('bg-amber-50');
  });
});

describe('removeUnscheduledWeeklyPlanItem', () => {
  it('removes only the matching unscheduled item', () => {
    const items: ExamPrepWeeklyPlanItem[] = [
      { id: 'scheduled', title: '배치됨', scheduledTodoId: 1 },
      { id: 'draft', title: '미배치' },
    ];

    expect(removeUnscheduledWeeklyPlanItem(items, 'draft')).toEqual([
      { id: 'scheduled', title: '배치됨', scheduledTodoId: 1 },
    ]);
  });
});

describe('reorderUnscheduledWeeklyPlanItems', () => {
  it('reorders unscheduled items while keeping scheduled items in place', () => {
    const items: ExamPrepWeeklyPlanItem[] = [
      { id: 'scheduled', title: '배치됨', scheduledTodoId: 1 },
      { id: 'a', title: 'A' },
      { id: 'b', title: 'B' },
    ];

    expect(reorderUnscheduledWeeklyPlanItems(items, 0, 1)).toEqual([
      { id: 'scheduled', title: '배치됨', scheduledTodoId: 1 },
      { id: 'b', title: 'B' },
      { id: 'a', title: 'A' },
    ]);
  });
});
