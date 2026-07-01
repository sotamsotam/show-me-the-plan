import { describe, expect, it } from 'vitest';
import { resolveExamPrepWeeklyPlans } from '@/lib/exam-prep-weekly-plan';
import { getUnscheduledExamPrepWeeklyPlanItemsForCell } from '@/lib/exam-prep-weekly-plan';
import { unlinkWeeklyPlanFromDeletedTodo } from '@/lib/weekly-plan-unlink';

describe('unlinkWeeklyPlanFromDeletedTodo', () => {
  it('clears scheduledTodoId so the item becomes unscheduled again', () => {
    const examPrepWeeklyPlans = resolveExamPrepWeeklyPlans({
      'sem1-r2': {
        weeks: {
          '4': {
            korean: [{ id: 'item-1', title: '교과서 단권화 정리', scheduledTodoId: 42 }],
          },
        },
      },
    });

    const result = unlinkWeeklyPlanFromDeletedTodo({
      todo: {
        id: 42,
        weeklyPlanSource: {
          kind: 'exam-prep',
          roundSlot: 'sem1-r2',
          weekNumber: 4,
          subjectId: 'korean',
          itemId: 'item-1',
        },
      },
      examPrepWeeklyPlans,
      vacationWeeklyPlans: {},
      regularWeeklyPlans: {},
    });

    expect(
      getUnscheduledExamPrepWeeklyPlanItemsForCell(
        result.examPrepWeeklyPlans,
        'sem1-r2',
        4,
        'korean'
      )
    ).toEqual([{ id: 'item-1', title: '교과서 단권화 정리' }]);
  });
});
