import type { EventInput } from '@fullcalendar/core';

import {
  buildRangeCacheKey,
  buildStudentCachePrefix,
  createRangeQueryCache,
} from '@/lib/range-query-cache';
import { publishProfileSubjects } from '@/lib/profile-subjects-store';
import type { ExpandedStudyPlanTodoEvent, StudyPlanTodo } from '@/lib/study-plan-todo';
import type { UserSubject } from '@/lib/user-subject';
import {
  buildStudyPlanTodosSearchParams,
  fetchStudyPlanTodosInRange,
  STUDY_PLAN_TODO_INCLUDE,
} from '@/lib/study-plan-todo-api';

const CACHE_NAMESPACE = 'study-plan-todos';

const cache = createRangeQueryCache<StudyPlanTodoRangeData>();

export interface StudyPlanTodoRangeData {
  todos: StudyPlanTodo[];
  events: EventInput[];
  expandedEvents: ExpandedStudyPlanTodoEvent[];
  subjects?: UserSubject[] | null;
}

async function fetchStudyPlanTodosFromApi(
  start: string,
  end: string,
  withStudent: (url: string) => string,
  studentUserId: number | null
): Promise<StudyPlanTodoRangeData> {
  const params = buildStudyPlanTodosSearchParams({
    start,
    end,
    include: STUDY_PLAN_TODO_INCLUDE.withExecutions,
  });
  const result = await fetchStudyPlanTodosInRange(
    withStudent(`/api/study-plan-todos?${params}`)
  );

  if (!result.ok) {
    throw new Error(result.error);
  }

  const subjects = result.data.subjects ?? null;
  if (subjects) {
    publishProfileSubjects(studentUserId, subjects);
  }

  return {
    todos: result.data.todos ?? [],
    events: result.data.events ?? [],
    expandedEvents: result.data.expandedEvents ?? [],
    subjects,
  };
}

export function readCachedStudyPlanTodosInRange(options: {
  start: string;
  end: string;
  studentUserId: number | null;
}): StudyPlanTodoRangeData | undefined {
  const key = buildRangeCacheKey(
    options.studentUserId,
    options.start,
    options.end,
    CACHE_NAMESPACE
  );
  return cache.read(key);
}

export async function getStudyPlanTodosInRange(
  options: {
    start: string;
    end: string;
    studentUserId: number | null;
  },
  withStudent: (url: string) => string,
  fetchOptions?: { force?: boolean }
): Promise<StudyPlanTodoRangeData> {
  const studentPrefix = buildStudentCachePrefix(options.studentUserId);
  const key = buildRangeCacheKey(
    options.studentUserId,
    options.start,
    options.end,
    CACHE_NAMESPACE
  );

  return cache.getOrFetch(
    key,
    studentPrefix,
    () => fetchStudyPlanTodosFromApi(options.start, options.end, withStudent, options.studentUserId),
    fetchOptions
  );
}

export function invalidateCachedStudyPlanTodos(studentUserId: number | null): void {
  cache.invalidateByStudentPrefix(buildStudentCachePrefix(studentUserId));
}
