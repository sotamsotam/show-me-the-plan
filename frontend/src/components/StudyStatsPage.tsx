'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import StudyPeriodRangeSelector from '@/components/StudyPeriodRangeSelector';
import AchievementLevelSection from '@/components/study-stats/AchievementLevelSection';
import AchievementSummaryCards from '@/components/study-stats/AchievementSummaryCards';
import AchievementTrendLineChart from '@/components/study-stats/AchievementTrendLineChart';
import ComparisonBarChart from '@/components/study-stats/ComparisonBarChart';
import DailyExecutedMinutesChart from '@/components/study-stats/DailyExecutedMinutesChart';
import ExecutionDeviationSection from '@/components/study-stats/ExecutionDeviationSection';
import ExecutionStatusChart from '@/components/study-stats/ExecutionStatusChart';
import InputModeSummary from '@/components/study-stats/InputModeSummary';
import MissedTodoTopList from '@/components/study-stats/MissedTodoTopList';
import PeriodComparisonSection from '@/components/study-stats/PeriodComparisonSection';
import RemainingPlanSummaryCards from '@/components/study-stats/RemainingPlanSummaryCards';
import StatsEffectiveRangeNotice from '@/components/study-stats/StatsEffectiveRangeNotice';
import SubjectComparisonBarChart from '@/components/study-stats/SubjectComparisonBarChart';
import SubjectImbalanceHighlight from '@/components/study-stats/SubjectImbalanceHighlight';
import SubjectQualityChart from '@/components/study-stats/SubjectQualityChart';
import WeekdayPatternChart from '@/components/study-stats/WeekdayPatternChart';
import WeeklyTrendChart from '@/components/study-stats/WeeklyTrendChart';
import { useProfileSubjectsContext } from '@/contexts/ProfileSubjectsContext';
import { useStudentApi } from '@/hooks/useStudentApi';
import { useStudyPeriodRange } from '@/hooks/useStudyPeriodRange';
import {
  resolveCurrentStudyPeriodOption,
  resolvePreviousMatchingStudyPeriodOption,
  STUDY_PERIOD_KIND_LABELS,
  studyPeriodRangeToIsoRange,
} from '@/lib/study-period-range-options';
import {
  aggregateAchievementLevelSummary,
  aggregateDailyAchievementRates,
  aggregateExecutionStatusDistribution,
  aggregateExecutionTimeDeviations,
  aggregateInputModeSummary,
  aggregateMissedTodoRanking,
  aggregatePeriodAchievementRates,
  aggregatePeriodComparison,
  aggregateRemainingPlanSummary,
  aggregateStudyStats,
  aggregateStudyStatsKpi,
  aggregateSubjectComparison,
  aggregateSubjectImbalance,
  aggregateSubjectQualityMatrix,
  aggregateWeekdayPatterns,
  aggregateWeeklyAchievementTrend,
  isPerformanceStatsRangeValid,
  isValidDateRange,
  resolveEffectiveStatsRange,
  toExclusiveApiRangeEnd,
} from '@/lib/study-stats';
import type { ExpandedStudyPlanTodoEvent, StudyPlanTodo } from '@/lib/study-plan-todo';
import {
  buildStudyPlanTodosSearchParams,
  fetchStudyPlanTodosInRange,
  STUDY_PLAN_TODO_INCLUDE,
} from '@/lib/study-plan-todo-api';

const EMPTY_STATS = {
  bySubjectPlanned: [],
  bySubjectExecuted: [],
  totalPlannedMinutes: 0,
  totalExecutedMinutes: 0,
};

const EMPTY_RATES = {
  totalTodos: 0,
  executedTodos: 0,
  countRate: null,
  plannedMinutes: 0,
  executedMinutes: 0,
  timeRate: null,
};

const EMPTY_KPI = {
  plannedDays: 0,
  studiedDays: 0,
  averageExecutedMinutesOnStudiedDays: null,
  targetMetDays: 0,
  targetMetRate: null,
  currentStreak: 0,
  longestStreak: 0,
};

const EMPTY_STATUS = { total: 0, entries: [] };

const EMPTY_ACHIEVEMENT = {
  overallAverageLevel: null,
  overallAverageRate: null,
  recordCount: 0,
  bySubject: [],
};

const EMPTY_PERIOD_COMPARISON = {
  comparisonKindLabel: null,
  previousLabel: null,
  previousStart: null,
  previousEnd: null,
  currentRates: EMPTY_RATES,
  previousRates: null,
  executedMinutesDelta: null,
  executedMinutesDeltaPercent: null,
  timeRateDelta: null,
  countRateDelta: null,
};

const EMPTY_REMAINING_PLAN = {
  remainingStart: null,
  remainingEnd: null,
  remainingDays: 0,
  plannedMinutes: 0,
  totalTodos: 0,
};

function resolveFetchRange(
  rangeStart: string,
  rangeEnd: string,
  previousStart: string | null,
  previousEnd: string | null
): { start: string; end: string } {
  let start = rangeStart;
  let end = rangeEnd;

  if (previousStart && previousStart < start) {
    start = previousStart;
  }

  if (previousEnd && previousEnd > end) {
    end = previousEnd;
  }

  return { start, end };
}

export default function StudyStatsPage() {
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

  const effectiveRange = useMemo(() => {
    if (rangeError) {
      return resolveEffectiveStatsRange('', '');
    }

    return resolveEffectiveStatsRange(rangeStart, rangeEnd);
  }, [rangeStart, rangeEnd, rangeError]);

  const performanceValid = isPerformanceStatsRangeValid(effectiveRange);
  const performanceStart = effectiveRange.performanceStart;
  const performanceEnd = effectiveRange.performanceEnd;
  const asOfDate = effectiveRange.asOfDate;

  const currentPeriod = useMemo(
    () =>
      rangeError
        ? null
        : resolveCurrentStudyPeriodOption(
            periodOptions,
            selectedPeriodKey,
            rangeStart,
            rangeEnd
          ),
    [periodOptions, selectedPeriodKey, rangeStart, rangeEnd, rangeError]
  );

  const previousPeriod = useMemo(
    () =>
      currentPeriod
        ? resolvePreviousMatchingStudyPeriodOption(periodOptions, currentPeriod.key)
        : null,
    [periodOptions, currentPeriod]
  );

  const previousRange = useMemo(() => {
    if (!previousPeriod) {
      return null;
    }

    return studyPeriodRangeToIsoRange(previousPeriod);
  }, [previousPeriod]);

  const fetchRange = useMemo(() => {
    if (rangeError) {
      return null;
    }

    return resolveFetchRange(
      rangeStart,
      rangeEnd,
      previousRange?.start ?? null,
      previousRange?.end ?? null
    );
  }, [rangeStart, rangeEnd, previousRange, rangeError]);

  const todosById = useMemo(
    () => new Map(todos.map((todo) => [todo.id, todo])),
    [todos]
  );

  const stats = useMemo(
    () =>
      !performanceValid
        ? EMPTY_STATS
        : aggregateStudyStats(
            events,
            todosById,
            performanceStart,
            performanceEnd,
            profileSubjects
          ),
    [events, todosById, performanceStart, performanceEnd, performanceValid, profileSubjects]
  );

  const subjectComparison = useMemo(
    () =>
      !performanceValid
        ? []
        : aggregateSubjectComparison(
            events,
            todosById,
            performanceStart,
            performanceEnd,
            profileSubjects
          ),
    [events, todosById, performanceStart, performanceEnd, performanceValid, profileSubjects]
  );

  const subjectImbalance = useMemo(
    () => (!performanceValid ? [] : aggregateSubjectImbalance(subjectComparison)),
    [subjectComparison, performanceValid]
  );

  const periodRates = useMemo(
    () =>
      !performanceValid
        ? EMPTY_RATES
        : aggregatePeriodAchievementRates(
            events,
            todosById,
            performanceStart,
            performanceEnd
          ),
    [events, todosById, performanceStart, performanceEnd, performanceValid]
  );

  const periodComparison = useMemo(
    () =>
      !performanceValid
        ? EMPTY_PERIOD_COMPARISON
        : aggregatePeriodComparison(
            events,
            todosById,
            rangeStart,
            rangeEnd,
            previousRange?.start ?? null,
            previousRange?.end ?? null,
            previousPeriod?.label ?? null,
            currentPeriod ? STUDY_PERIOD_KIND_LABELS[currentPeriod.kind] : null,
            asOfDate
          ),
    [
      events,
      todosById,
      rangeStart,
      rangeEnd,
      previousRange,
      previousPeriod,
      asOfDate,
      performanceValid,
    ]
  );

  const remainingPlan = useMemo(
    () =>
      rangeError
        ? EMPTY_REMAINING_PLAN
        : aggregateRemainingPlanSummary(events, rangeStart, rangeEnd, asOfDate),
    [events, rangeStart, rangeEnd, rangeError, asOfDate]
  );

  const kpi = useMemo(
    () =>
      !performanceValid
        ? EMPTY_KPI
        : aggregateStudyStatsKpi(events, todosById, performanceStart, performanceEnd),
    [events, todosById, performanceStart, performanceEnd, performanceValid]
  );

  const weekdayPatterns = useMemo(
    () =>
      !performanceValid
        ? []
        : aggregateWeekdayPatterns(events, todosById, performanceStart, performanceEnd),
    [events, todosById, performanceStart, performanceEnd, performanceValid]
  );

  const weeklyTrend = useMemo(
    () =>
      !performanceValid
        ? []
        : aggregateWeeklyAchievementTrend(
            events,
            todosById,
            performanceStart,
            performanceEnd
          ),
    [events, todosById, performanceStart, performanceEnd, performanceValid]
  );

  const executionStatus = useMemo(
    () =>
      rangeError
        ? EMPTY_STATUS
        : aggregateExecutionStatusDistribution(
            events,
            todosById,
            rangeStart,
            rangeEnd,
            asOfDate
          ),
    [events, todosById, rangeStart, rangeEnd, rangeError, asOfDate]
  );

  const achievementLevel = useMemo(
    () =>
      !performanceValid
        ? EMPTY_ACHIEVEMENT
        : aggregateAchievementLevelSummary(
            events,
            todosById,
            performanceStart,
            performanceEnd,
            profileSubjects
          ),
    [events, todosById, performanceStart, performanceEnd, performanceValid, profileSubjects]
  );

  const subjectQuality = useMemo(
    () =>
      !performanceValid
        ? []
        : aggregateSubjectQualityMatrix(subjectComparison, achievementLevel),
    [subjectComparison, achievementLevel, performanceValid]
  );

  const inputModeSummary = useMemo(
    () =>
      !performanceValid
        ? []
        : aggregateInputModeSummary(events, todosById, performanceStart, performanceEnd),
    [events, todosById, performanceStart, performanceEnd, performanceValid]
  );

  const missedTodos = useMemo(
    () =>
      !performanceValid
        ? []
        : aggregateMissedTodoRanking(
            events,
            todosById,
            performanceStart,
            performanceEnd,
            profileSubjects,
            5,
            asOfDate
          ),
    [
      events,
      todosById,
      performanceStart,
      performanceEnd,
      profileSubjects,
      asOfDate,
      performanceValid,
    ]
  );

  const executionDeviations = useMemo(
    () =>
      !performanceValid
        ? []
        : aggregateExecutionTimeDeviations(
            events,
            todosById,
            performanceStart,
            performanceEnd,
            profileSubjects
          ),
    [events, todosById, performanceStart, performanceEnd, performanceValid, profileSubjects]
  );

  const dailyAchievement = useMemo(
    () =>
      !performanceValid
        ? []
        : aggregateDailyAchievementRates(
            events,
            todosById,
            performanceStart,
            performanceEnd
          ),
    [events, todosById, performanceStart, performanceEnd, performanceValid]
  );

  const fetchStats = useCallback(
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
    if (!fetchRange) {
      return;
    }

    fetchStats(fetchRange.start, fetchRange.end);
  }, [fetchRange, studentUserId, fetchStats]);

  const isLoading = loading && !rangeError;
  const showPerformanceStats = performanceValid && !rangeError;

  return (
    <div className="mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">공부통계</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          선택한 기간의 공부계획과 실행 시간을 과목별·전체로 비교합니다.
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

      <div className="mt-4 space-y-4">
        {!rangeError ? (
          <StatsEffectiveRangeNotice range={effectiveRange} />
        ) : null}

        {showPerformanceStats ? (
          <>
            <AchievementSummaryCards rates={periodRates} kpi={kpi} loading={isLoading} />

            <PeriodComparisonSection data={periodComparison} loading={isLoading} />

            <RemainingPlanSummaryCards data={remainingPlan} loading={isLoading} />

            <div className="grid gap-4 lg:grid-cols-2">
              <WeekdayPatternChart data={weekdayPatterns} loading={isLoading} />
              <WeeklyTrendChart data={weeklyTrend} loading={isLoading} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <DailyExecutedMinutesChart data={dailyAchievement} loading={isLoading} />
              <AchievementTrendLineChart data={dailyAchievement} loading={isLoading} />
            </div>

            <SubjectImbalanceHighlight data={subjectImbalance} loading={isLoading} />
            <SubjectComparisonBarChart data={subjectComparison} loading={isLoading} />

            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              <MissedTodoTopList data={missedTodos} loading={isLoading} />
              <ExecutionDeviationSection data={executionDeviations} loading={isLoading} />
              <SubjectQualityChart data={subjectQuality} loading={isLoading} />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <ExecutionStatusChart data={executionStatus} loading={isLoading} />
              <AchievementLevelSection data={achievementLevel} loading={isLoading} />
              <InputModeSummary data={inputModeSummary} loading={isLoading} />
            </div>

            <ComparisonBarChart
              plannedMinutes={stats.totalPlannedMinutes}
              executedMinutes={stats.totalExecutedMinutes}
              loading={isLoading}
            />
          </>
        ) : !rangeError && !isLoading ? (
          <p className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500 shadow-sm dark:border-neutral-800 dark:bg-zinc-900 dark:text-gray-400">
            {effectiveRange.isNotStartedYet
              ? '선택한 구간이 아직 시작되지 않아 성과 통계를 표시할 수 없습니다.'
              : '선택한 기간에 공부 기록이 없습니다.'}
          </p>
        ) : isLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">불러오는 중...</p>
        ) : null}
      </div>
    </div>
  );
}
