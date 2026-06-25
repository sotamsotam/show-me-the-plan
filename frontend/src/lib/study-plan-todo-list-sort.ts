import type { ExpandedStudyPlanTodoEvent } from '@/lib/study-plan-todo';
import {
  resolveProfileSubjects,
  type PlanSubjectKey,
  type ProfileSubjectsInput,
} from '@/lib/user-subject';

export type StudyPlanTodoListSortMode = 'time' | 'subject';

export const DEFAULT_STUDY_PLAN_TODO_LIST_SORT_MODE: StudyPlanTodoListSortMode = 'time';

const STORAGE_KEY = 'study-plan-todo-list-sort';

function isSortMode(value: string | null): value is StudyPlanTodoListSortMode {
  return value === 'time' || value === 'subject';
}

export function readStudyPlanTodoListSortMode(): StudyPlanTodoListSortMode {
  if (typeof window === 'undefined') {
    return DEFAULT_STUDY_PLAN_TODO_LIST_SORT_MODE;
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  return isSortMode(stored) ? stored : DEFAULT_STUDY_PLAN_TODO_LIST_SORT_MODE;
}

export function writeStudyPlanTodoListSortMode(mode: StudyPlanTodoListSortMode): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(STORAGE_KEY, mode);
}

export function getSubjectOrderIndex(
  subject: PlanSubjectKey,
  subjects?: ProfileSubjectsInput
): number {
  const resolved = resolveProfileSubjects(subjects);
  const index = resolved.findIndex((item) => item.id === subject);

  if (index >= 0) {
    return index;
  }

  return Number.MAX_SAFE_INTEGER;
}

export function sortExpandedEventsBySubjectOrder(
  events: ExpandedStudyPlanTodoEvent[],
  subjects?: ProfileSubjectsInput
): ExpandedStudyPlanTodoEvent[] {
  return [...events].sort((a, b) => {
    const subjectDiff =
      getSubjectOrderIndex(a.subject, subjects) - getSubjectOrderIndex(b.subject, subjects);

    if (subjectDiff !== 0) {
      return subjectDiff;
    }

    if (a.subject !== b.subject) {
      return a.subject.localeCompare(b.subject);
    }

    const startDiff = a.start.localeCompare(b.start);
    if (startDiff !== 0) {
      return startDiff;
    }

    return a.id.localeCompare(b.id);
  });
}

export interface StudyPlanTodoSubjectGroup {
  subject: PlanSubjectKey;
  todos: ExpandedStudyPlanTodoEvent[];
}

export function groupConsecutiveTodosBySubject(
  todos: ExpandedStudyPlanTodoEvent[]
): StudyPlanTodoSubjectGroup[] {
  const groups: StudyPlanTodoSubjectGroup[] = [];

  for (const todo of todos) {
    const lastGroup = groups.at(-1);

    if (lastGroup?.subject === todo.subject) {
      lastGroup.todos.push(todo);
      continue;
    }

    groups.push({ subject: todo.subject, todos: [todo] });
  }

  return groups;
}
