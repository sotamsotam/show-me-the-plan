import {
  clearExamPrepWeeklyPlanItemScheduledTodoId,
  clearExamPrepWeeklyPlanScheduledTodoIdByTodoId,
  type ExamPrepWeeklyPlans,
} from '@/lib/exam-prep-weekly-plan';
import {
  clearRegularWeeklyPlanItemScheduledTodoId,
  clearRegularWeeklyPlanScheduledTodoIdByTodoId,
  type RegularWeeklyPlans,
} from '@/lib/regular-weekly-plan';
import type { StudyPlanTodo } from '@/lib/study-plan-todo';
import {
  clearVacationWeeklyPlanItemScheduledTodoId,
  clearVacationWeeklyPlanScheduledTodoIdByTodoId,
  type VacationWeeklyPlans,
} from '@/lib/vacation-weekly-plan';

export interface WeeklyPlanUnlinkInput {
  todo: Pick<StudyPlanTodo, 'id' | 'weeklyPlanSource'>;
  examPrepWeeklyPlans: ExamPrepWeeklyPlans;
  vacationWeeklyPlans: VacationWeeklyPlans;
  regularWeeklyPlans: RegularWeeklyPlans;
}

export interface WeeklyPlanUnlinkResult {
  examPrepWeeklyPlans: ExamPrepWeeklyPlans;
  vacationWeeklyPlans: VacationWeeklyPlans;
  regularWeeklyPlans: RegularWeeklyPlans;
}

/** 스터디 플랜 삭제 시 주차별 공부계획의 scheduledTodoId 연결을 해제합니다. */
export function unlinkWeeklyPlanFromDeletedTodo(
  input: WeeklyPlanUnlinkInput
): WeeklyPlanUnlinkResult {
  const { todo } = input;
  const source = todo.weeklyPlanSource;

  let examPrepWeeklyPlans = input.examPrepWeeklyPlans;
  let vacationWeeklyPlans = input.vacationWeeklyPlans;
  let regularWeeklyPlans = input.regularWeeklyPlans;

  if (source?.kind === 'exam-prep') {
    examPrepWeeklyPlans = clearExamPrepWeeklyPlanItemScheduledTodoId(
      examPrepWeeklyPlans,
      source.roundSlot,
      source.weekNumber,
      source.subjectId,
      source.itemId
    );
  }

  if (source?.kind === 'vacation') {
    vacationWeeklyPlans = clearVacationWeeklyPlanItemScheduledTodoId(
      vacationWeeklyPlans,
      source.periodSlot,
      source.weekNumber,
      source.subjectId,
      source.itemId
    );
  }

  if (source?.kind === 'regular') {
    regularWeeklyPlans = clearRegularWeeklyPlanItemScheduledTodoId(
      regularWeeklyPlans,
      source.periodKey,
      source.weekNumber,
      source.subjectId,
      source.itemId
    );
  }

  examPrepWeeklyPlans = clearExamPrepWeeklyPlanScheduledTodoIdByTodoId(
    examPrepWeeklyPlans,
    todo.id
  );
  vacationWeeklyPlans = clearVacationWeeklyPlanScheduledTodoIdByTodoId(
    vacationWeeklyPlans,
    todo.id
  );
  regularWeeklyPlans = clearRegularWeeklyPlanScheduledTodoIdByTodoId(
    regularWeeklyPlans,
    todo.id
  );

  return {
    examPrepWeeklyPlans,
    vacationWeeklyPlans,
    regularWeeklyPlans,
  };
}
