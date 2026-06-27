import {
  EXAM_ROUND_SLOTS,
  getWeeksForSlot,
  type ExamPrepWeeksByRound,
  type ExamRoundSlot,
} from '@/lib/exam-countdown';
import type { ExecutionStatus, StudyPlanTodo } from '@/lib/study-plan-todo';
import {
  findExamPrepWeeklyPlanItem,
  getExamPrepWeeklyPlanItems,
  getUnscheduledExamPrepWeeklyPlanItems,
  isScheduledExamPrepWeeklyPlanItem,
  MAX_EXAM_PREP_WEEKLY_PLAN_ITEMS_PER_CELL,
  removeExamPrepWeeklyPlanItemFromCell,
  type ExamPrepWeeklyPlanItem,
  type ExamPrepWeeklyPlans,
  writeExamPrepWeeklyPlanItemsForCell,
} from '@/lib/exam-prep-weekly-plan';

export type UnachievedReason = 'incomplete' | 'overdue_unexecuted';

export interface UnachievedWeeklyPlanItem {
  roundSlot: ExamRoundSlot;
  weekNumber: number;
  subjectId: string;
  item: ExamPrepWeeklyPlanItem;
  todoId: number;
  occurrenceDate: string;
  reason: UnachievedReason;
}

export interface ExamPrepWeeklyPlanItemRef {
  roundSlot: ExamRoundSlot;
  weekNumber: number;
  subjectId: string;
  itemId: string;
}

export interface CarryOverExamPrepWeeklyPlanItemInput extends ExamPrepWeeklyPlanItemRef {
  toWeek: number;
}

function resolveUnachievedReason(
  todo: StudyPlanTodo,
  occurrenceDate: string,
  today: string
): UnachievedReason | null {
  const record = todo.executionRecords[occurrenceDate];
  const status = record?.status as ExecutionStatus | undefined;

  if (status === 'incomplete') {
    return 'incomplete';
  }

  if (status === 'completed' || status === 'partial') {
    return null;
  }

  if (occurrenceDate < today) {
    return 'overdue_unexecuted';
  }

  return null;
}

export function resolveUnachievedWeeklyPlanItems(
  plans: ExamPrepWeeklyPlans,
  todos: StudyPlanTodo[],
  today: string
): UnachievedWeeklyPlanItem[] {
  const todoById = new Map(todos.map((todo) => [todo.id, todo]));
  const results: UnachievedWeeklyPlanItem[] = [];

  for (const roundSlot of EXAM_ROUND_SLOTS) {
    const roundPlan = plans[roundSlot];
    if (!roundPlan?.weeks) {
      continue;
    }

    for (const [weekKey, weekSubjects] of Object.entries(roundPlan.weeks)) {
      const weekNumber = Number(weekKey);
      if (!Number.isInteger(weekNumber) || !weekSubjects) {
        continue;
      }

      for (const [subjectId, items] of Object.entries(weekSubjects)) {
        if (!items) {
          continue;
        }

        for (const item of items) {
          if (!isScheduledExamPrepWeeklyPlanItem(item)) {
            continue;
          }

          const todo = todoById.get(item.scheduledTodoId!);
          if (!todo || todo.recurrenceType !== 'once' || !todo.date) {
            continue;
          }

          const reason = resolveUnachievedReason(todo, todo.date, today);
          if (!reason) {
            continue;
          }

          results.push({
            roundSlot,
            weekNumber,
            subjectId,
            item,
            todoId: todo.id,
            occurrenceDate: todo.date,
            reason,
          });
        }
      }
    }
  }

  return results.sort((left, right) => {
    const byDate = left.occurrenceDate.localeCompare(right.occurrenceDate);
    if (byDate !== 0) {
      return byDate;
    }

    const byRound = left.roundSlot.localeCompare(right.roundSlot);
    if (byRound !== 0) {
      return byRound;
    }

    return left.weekNumber - right.weekNumber;
  });
}

export function resolveDefaultCarryOverWeek(
  fromWeek: number,
  examPrepWeeksByRound: ExamPrepWeeksByRound,
  roundSlot: ExamRoundSlot
): number | null {
  const maxWeek = getWeeksForSlot(roundSlot, examPrepWeeksByRound);
  const nextWeek = fromWeek + 1;

  if (nextWeek < 1 || nextWeek > maxWeek) {
    return null;
  }

  return nextWeek;
}

export function carryOverExamPrepWeeklyPlanItem(
  plans: ExamPrepWeeklyPlans,
  input: CarryOverExamPrepWeeklyPlanItemInput
): { plans: ExamPrepWeeklyPlans } | { error: string } {
  const { roundSlot, weekNumber: fromWeek, subjectId, itemId, toWeek } = input;

  if (fromWeek === toWeek) {
    return { error: '같은 주차로는 이월할 수 없습니다.' };
  }

  const item = findExamPrepWeeklyPlanItem(plans, roundSlot, fromWeek, subjectId, itemId);
  if (!item) {
    return { error: '공부 계획 항목을 찾을 수 없습니다.' };
  }

  if (!isScheduledExamPrepWeeklyPlanItem(item)) {
    return { error: '배치되지 않은 항목은 이월할 수 없습니다.' };
  }

  const targetExisting = getExamPrepWeeklyPlanItems(plans, roundSlot, toWeek, subjectId);
  const targetUnscheduled = getUnscheduledExamPrepWeeklyPlanItems(targetExisting);

  if (targetUnscheduled.length >= MAX_EXAM_PREP_WEEKLY_PLAN_ITEMS_PER_CELL) {
    return { error: '대상 주차에 더 이상 항목을 추가할 수 없습니다.' };
  }

  let nextPlans = removeExamPrepWeeklyPlanItemFromCell(
    plans,
    roundSlot,
    fromWeek,
    subjectId,
    itemId
  );

  const carriedItem: ExamPrepWeeklyPlanItem = { id: item.id, title: item.title };
  nextPlans = writeExamPrepWeeklyPlanItemsForCell(
    nextPlans,
    roundSlot,
    toWeek,
    subjectId,
    [...targetUnscheduled, carriedItem]
  );

  return { plans: nextPlans };
}

export function deleteExamPrepWeeklyPlanItem(
  plans: ExamPrepWeeklyPlans,
  input: ExamPrepWeeklyPlanItemRef
): { plans: ExamPrepWeeklyPlans; scheduledTodoId: number | null } | { error: string } {
  const item = findExamPrepWeeklyPlanItem(
    plans,
    input.roundSlot,
    input.weekNumber,
    input.subjectId,
    input.itemId
  );

  if (!item) {
    return { error: '공부 계획 항목을 찾을 수 없습니다.' };
  }

  const scheduledTodoId = item.scheduledTodoId ?? null;

  return {
    plans: removeExamPrepWeeklyPlanItemFromCell(
      plans,
      input.roundSlot,
      input.weekNumber,
      input.subjectId,
      input.itemId
    ),
    scheduledTodoId,
  };
}

export function formatUnachievedReasonLabel(reason: UnachievedReason): string {
  return reason === 'incomplete' ? '미완료' : '미실행';
}
