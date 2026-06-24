'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  getStudyPlanTodosInRange,
  readCachedStudyPlanTodosInRange,
  type StudyPlanTodoRangeData,
} from '@/lib/cached-study-plan-todos';
import { useStudentApi } from '@/hooks/useStudentApi';
import type { EventInput } from '@fullcalendar/core';
import type { ExpandedStudyPlanTodoEvent, StudyPlanTodo } from '@/lib/study-plan-todo';

interface UseStudyPlanTodosInRangeOptions {
  start: string;
  end: string;
  enabled?: boolean;
}

interface UseStudyPlanTodosInRangeResult {
  todos: StudyPlanTodo[];
  events: EventInput[];
  expandedEvents: ExpandedStudyPlanTodoEvent[];
  isLoading: boolean;
  error: string;
  refetch: (force?: boolean) => Promise<void>;
}

export function useStudyPlanTodosInRange(
  options: UseStudyPlanTodosInRangeOptions
): UseStudyPlanTodosInRangeResult {
  const { start, end, enabled = true } = options;
  const { withStudent, studentUserId } = useStudentApi();
  const [data, setData] = useState<StudyPlanTodoRangeData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const fetchIdRef = useRef(0);

  const load = useCallback(
    async (force = false) => {
      if (!enabled || !start || !end) {
        return;
      }

      const fetchId = ++fetchIdRef.current;

      if (!force) {
        const cached = readCachedStudyPlanTodosInRange({ start, end, studentUserId });
        if (cached) {
          setData(cached);
          setError('');
          setIsLoading(false);
          return;
        }
      }

      setIsLoading(true);
      setError('');

      try {
        const next = await getStudyPlanTodosInRange(
          { start, end, studentUserId },
          withStudent,
          { force }
        );

        if (fetchId !== fetchIdRef.current) {
          return;
        }

        setData(next);
        setError('');
      } catch (loadError) {
        if (fetchId !== fetchIdRef.current) {
          return;
        }

        setData(null);
        setError(
          loadError instanceof Error
            ? loadError.message
            : '스터디 플랜을 불러오지 못했습니다.'
        );
      } finally {
        if (fetchId === fetchIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [enabled, end, start, studentUserId, withStudent]
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const refetch = useCallback(async (force = true) => {
    await load(force);
  }, [load]);

  return {
    todos: data?.todos ?? [],
    events: data?.events ?? [],
    expandedEvents: data?.expandedEvents ?? [],
    isLoading,
    error,
    refetch,
  };
}
