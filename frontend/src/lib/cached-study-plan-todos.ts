import type { EventInput } from '@fullcalendar/core';

import {
  buildRangeCacheKey,
  buildStudentCachePrefix,
  createRangeQueryCache,
} from '@/lib/range-query-cache';
import type { ExpandedStudyPlanTodoEvent, StudyPlanTodo } from '@/lib/study-plan-todo';
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
}

async function fetchStudyPlanTodosFromApi(
  start: string,
  end: string,
  withStudent: (url: string) => string
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

  return {
    todos: result.data.todos ?? [],
    events: result.data.events ?? [],
    expandedEvents: result.data.expandedEvents ?? [],
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
    () => fetchStudyPlanTodosFromApi(options.start, options.end, withStudent),
    fetchOptions
  );
}

export function invalidateCachedStudyPlanTodos(studentUserId: number | null): void {
  cache.invalidateByStudentPrefix(buildStudentCachePrefix(studentUserId));
}
