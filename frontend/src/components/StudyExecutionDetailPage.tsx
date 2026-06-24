'use client';

import { useMemo } from 'react';
import StudyExecutionDetailTable from '@/components/study-execution-detail/StudyExecutionDetailTable';
import StudyPeriodRangeSelector from '@/components/StudyPeriodRangeSelector';
import { useProfileSubjectsContext } from '@/contexts/ProfileSubjectsContext';
import { useStudyPeriodRange } from '@/hooks/useStudyPeriodRange';
import { useStudyPlanTodosInRange } from '@/hooks/useStudyPlanTodosInRange';
import { buildStudyExecutionDetailGroups } from '@/lib/study-execution-detail';
import { isValidDateRange, toExclusiveApiRangeEnd } from '@/lib/study-stats';

export default function StudyExecutionDetailPage() {
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
  const apiRangeEnd = useMemo(() => toExclusiveApiRangeEnd(rangeEnd), [rangeEnd]);
  const rangeIsValid = !rangeError && isValidDateRange(rangeStart, rangeEnd);
  const {
    todos,
    expandedEvents: events,
    isLoading: loading,
    error,
  } = useStudyPlanTodosInRange({
    start: rangeStart,
    end: apiRangeEnd,
    enabled: rangeIsValid,
  });

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
