import type { EventInput } from '@fullcalendar/core';

import type { ExpandedStudyPlanTodoEvent, PlanSubjectKey, StudyPlanTodo } from '@/lib/study-plan-todo';

export const STUDY_PLAN_TODO_INCLUDE = {
  calendar: 'events,meta',
  withExecutions: 'events,meta,executions',
} as const;

export function buildStudyPlanTodosSearchParams(options: {
  start: string;
  end: string;
  include?: string;
}): URLSearchParams {
  const params = new URLSearchParams({
    start: options.start,
    end: options.end,
  });

  if (options.include) {
    params.set('include', options.include);
  }

  return params;
}

export function normalizeStudyPlanTodos(raw: StudyPlanTodo[] | undefined): StudyPlanTodo[] {
  return (raw ?? []).map((item) => ({
    ...item,
    excludedDates: item.excludedDates ?? [],
    overrides: item.overrides ?? {},
    executionRecords: item.executionRecords ?? {},
  }));
}

export interface StudyPlanTodosApiResponse {
  todos?: StudyPlanTodo[];
  events?: EventInput[];
  expandedEvents?: ExpandedStudyPlanTodoEvent[];
  error?: string;
}

export async function fetchStudyPlanTodosInRange(
  url: string,
  init?: RequestInit
): Promise<
  | { ok: true; data: StudyPlanTodosApiResponse }
  | { ok: false; error: string }
> {
  try {
    const res = await fetch(url, { credentials: 'include', ...init });
    const data = (await res.json()) as StudyPlanTodosApiResponse;

    if (!res.ok) {
      return {
        ok: false,
        error: data.error ?? '스터디 플랜을 불러오지 못했습니다.',
      };
    }

    return {
      ok: true,
      data: {
        ...data,
        todos: normalizeStudyPlanTodos(data.todos),
      },
    };
  } catch {
    return { ok: false, error: '데이터를 불러오지 못했습니다.' };
  }
}

export async function fetchStudyPlanTodoTitles(
  withStudent: (path: string) => string,
  options: { q?: string; subject?: PlanSubjectKey } = {}
): Promise<{ ok: true; titles: string[] } | { ok: false; error: string }> {
  const params = new URLSearchParams();

  if (options.q?.trim()) {
    params.set('q', options.q.trim());
  }

  if (options.subject) {
    params.set('subject', options.subject);
  }

  const query = params.toString();

  try {
    const res = await fetch(
      withStudent(query ? `/api/study-plan-todos/titles?${query}` : '/api/study-plan-todos/titles'),
      { credentials: 'include' }
    );
    const data = (await res.json()) as { titles?: string[]; error?: string };

    if (!res.ok) {
      return {
        ok: false,
        error: data.error ?? '스터디 플랜 제목을 불러오지 못했습니다.',
      };
    }

    return { ok: true, titles: data.titles ?? [] };
  } catch {
    return { ok: false, error: '데이터를 불러오지 못했습니다.' };
  }
}
