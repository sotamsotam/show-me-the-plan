'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import StudyExecutionDetailTable from '@/components/study-execution-detail/StudyExecutionDetailTable';
import StudyPeriodRangeSelector from '@/components/StudyPeriodRangeSelector';
import { useProfileSubjectsContext } from '@/contexts/ProfileSubjectsContext';
import { useStudentApi } from '@/hooks/useStudentApi';
import { useStudyPeriodRange } from '@/hooks/useStudyPeriodRange';
import { buildStudyExecutionDetailGroups } from '@/lib/study-execution-detail';
import { isValidDateRange, toExclusiveApiRangeEnd } from '@/lib/study-stats';
import type { ExpandedStudyPlanTodoEvent, StudyPlanTodo } from '@/lib/study-plan-todo';
import {
  buildStudyPlanTodosSearchParams,
  fetchStudyPlanTodosInRange,
  STUDY_PLAN_TODO_INCLUDE,
} from '@/lib/study-plan-todo-api';

export default function StudyExecutionDetailPage() {
  const { withStudent, studentUserId } = useStudentApi();
  const { subjects: profileSubjects } = useProfileSubjectsContext();
  const {
    rangeStart,
    rangeEnd,
    rangeError,
    showRangeError,
    selectedPeriodKey,
    periodOptions,
    periodOptionsLoading,
    handlePeriodSelect,
    handleRangeStartChange,
    handleRangeEndChange,
  } = useStudyPeriodRange();
  const [events, setEvents] = useState<ExpandedStudyPlanTodoEvent[]>([]);
  const [todos, setTodos] = useState<StudyPlanTodo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fetchIdRef = useRef(0);

  const todosById = useMemo(
    () => new Map(todos.map((todo) => [todo.id, todo])),
    [todos]
  );

  const subjectGroups = useMemo(
    () =>
      rangeError
        ? []
        : buildStudyExecutionDetailGroups(
            events,
            todosById,
            rangeStart,
            rangeEnd,
            profileSubjects
          ),
    [events, todosById, rangeStart, rangeEnd, rangeError, profileSubjects]
  );

  const fetchData = useCallback(
    async (start: string, end: string) => {
      if (!isValidDateRange(start, end)) {
        return;
      }

      const fetchId = ++fetchIdRef.current;
      setLoading(true);
      setError('');

      const params = buildStudyPlanTodosSearchParams({
        start,
        end: toExclusiveApiRangeEnd(end),
        include: STUDY_PLAN_TODO_INCLUDE.withExecutions,
      });

      try {
        const result = await fetchStudyPlanTodosInRange(
          withStudent(`/api/study-plan-todos?${params}`)
        );

        if (fetchId !== fetchIdRef.current) {
          return;
        }

        if (!result.ok) {
          setEvents([]);
          setTodos([]);
          setError(result.error);
          return;
        }

        setEvents(result.data.expandedEvents ?? []);
        setTodos(result.data.todos ?? []);
      } catch {
        if (fetchId !== fetchIdRef.current) {
          return;
        }

        setEvents([]);
        setTodos([]);
        setError('데이터를 불러오지 못했습니다.');
      } finally {
        if (fetchId === fetchIdRef.current) {
          setLoading(false);
        }
      }
    },
    [withStudent]
  );

  useEffect(() => {
    if (rangeError) {
      return;
    }

    fetchData(rangeStart, rangeEnd);
  }, [rangeStart, rangeEnd, rangeError, studentUserId, fetchData]);

  const isEmpty = !loading && !rangeError && subjectGroups.length === 0;

  return (
    <div className="mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">공부현황</h1>
        <p className="mt-1 text-sm text-[#e2feff]">
          선택한 기간의 스터디 플랜 실행 내역을 과목별로 확인합니다.
        </p>
      </div>

      {(error || showRangeError) && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {showRangeError ? rangeError : error}
        </p>
      )}

      <StudyPeriodRangeSelector
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        selectedPeriodKey={selectedPeriodKey}
        periodOptions={periodOptions}
        periodOptionsLoading={periodOptionsLoading}
        onPeriodSelect={handlePeriodSelect}
        onRangeStartChange={handleRangeStartChange}
        onRangeEndChange={handleRangeEndChange}
      />

      {loading && !rangeError ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">불러오는 중...</p>
      ) : isEmpty ? (
        <p className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500 shadow-sm dark:border-neutral-800 dark:bg-zinc-900 dark:text-gray-400">
          등록된 공부데이터가 없습니다
        </p>
      ) : (
        !rangeError && <StudyExecutionDetailTable subjectGroups={subjectGroups} />
      )}
    </div>
  );
}
