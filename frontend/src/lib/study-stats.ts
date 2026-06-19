import {
  calculateExecutedStudyMinutes,
  calculatePlannedStudyMinutes,
  durationBetweenIso,
  durationBetweenTimes,
  isExecutedOnTimeline,
} from '@/lib/day-timeline';
import {
  getExecutionRecord,
  getSubjectLabel,
  type ExecutionStatus,
  type ExpandedStudyPlanTodoEvent,
  type PlanSubjectKey,
  type ProfileSubjectsInput,
  type StudyPlanTodo,
} from '@/lib/study-plan-todo';
import { getSubjectChartColor } from '@/lib/study-stats-colors';
import { getTodayIsoDate, shiftIsoDate } from '@/lib/user-schedule';

export interface SubjectMinutesEntry {
  subject: PlanSubjectKey;
  label: string;
  minutes: number;
  color: string;
}

export interface StudyStatsSummary {
  bySubjectPlanned: SubjectMinutesEntry[];
  bySubjectExecuted: SubjectMinutesEntry[];
  totalPlannedMinutes: number;
  totalExecutedMinutes: number;
}

export interface DailyAchievementPoint {
  date: string;
  label: string;
  plannedMinutes: number;
  executedMinutes: number;
  achievementRate: number | null;
}

export interface SubjectComparisonEntry {
  subject: PlanSubjectKey;
  label: string;
  color: string;
  plannedMinutes: number;
  executedMinutes: number;
  achievementRate: number | null;
}

export interface PeriodAchievementRates {
  totalTodos: number;
  executedTodos: number;
  countRate: number | null;
  plannedMinutes: number;
  executedMinutes: number;
  timeRate: number | null;
}

export type ExecutionStatusKey = ExecutionStatus | 'pending' | 'scheduled';

export interface EffectiveStatsRange {
  fullStart: string;
  fullEnd: string;
  performanceStart: string;
  performanceEnd: string;
  asOfDate: string;
  hasFuturePortion: boolean;
  isNotStartedYet: boolean;
}

export interface RemainingPlanSummary {
  remainingStart: string | null;
  remainingEnd: string | null;
  remainingDays: number;
  plannedMinutes: number;
  totalTodos: number;
}

export interface ExecutionStatusEntry {
  status: ExecutionStatusKey;
  label: string;
  count: number;
  color: string;
}

export interface ExecutionStatusDistribution {
  total: number;
  entries: ExecutionStatusEntry[];
}

export interface SubjectAchievementLevelEntry {
  subject: PlanSubjectKey;
  label: string;
  averageLevel: number | null;
  averageRate: number | null;
  recordCount: number;
}

export interface AchievementLevelSummary {
  overallAverageLevel: number | null;
  overallAverageRate: number | null;
  recordCount: number;
  bySubject: SubjectAchievementLevelEntry[];
}

export interface StudyStatsKpiSummary {
  plannedDays: number;
  studiedDays: number;
  averageExecutedMinutesOnStudiedDays: number | null;
  targetMetDays: number;
  targetMetRate: number | null;
  currentStreak: number;
  longestStreak: number;
}

export interface WeekdayPatternEntry {
  weekday: number;
  label: string;
  dayCount: number;
  plannedMinutes: number;
  executedMinutes: number;
  averagePlannedMinutes: number | null;
  averageExecutedMinutes: number | null;
  achievementRate: number | null;
}

export interface WeeklyAchievementPoint {
  weekKey: string;
  label: string;
  startDate: string;
  endDate: string;
  plannedMinutes: number;
  executedMinutes: number;
  achievementRate: number | null;
  movingAverageRate: number | null;
  movingAverageExecutedMinutes: number | null;
}

export interface PeriodComparisonSummary {
  comparisonKindLabel: string | null;
  previousLabel: string | null;
  previousStart: string | null;
  previousEnd: string | null;
  currentRates: PeriodAchievementRates;
  previousRates: PeriodAchievementRates | null;
  executedMinutesDelta: number | null;
  executedMinutesDeltaPercent: number | null;
  timeRateDelta: number | null;
  countRateDelta: number | null;
}

export interface MissedTodoRankingEntry {
  todoId: number;
  subject: PlanSubjectKey;
  label: string;
  title: string;
  missedCount: number;
  totalCount: number;
}

export interface ExecutionDeviationEntry {
  todoId: number;
  subject: PlanSubjectKey;
  label: string;
  title: string;
  plannedMinutes: number;
  executedMinutes: number;
  deviationMinutes: number;
}

export interface SubjectQualityEntry {
  subject: PlanSubjectKey;
  label: string;
  color: string;
  timeAchievementRate: number | null;
  qualityRate: number | null;
}

export interface InputModeSummaryEntry {
  mode: 'direct' | 'timer' | 'unknown';
  label: string;
  count: number;
  averageLevel: number | null;
  averageRate: number | null;
}

export interface SubjectImbalanceEntry {
  subject: PlanSubjectKey;
  label: string;
  color: string;
  plannedShare: number;
  executedShare: number;
  gapPoints: number;
}

export const STUDY_STATS_TARGET_ACHIEVEMENT_THRESHOLD = 80;

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

const EXECUTION_STATUS_LABELS: Record<ExecutionStatusKey, string> = {
  pending: '미실행',
  completed: '실행완료',
  partial: '부분완료',
  incomplete: '미완료',
  scheduled: '예정',
};

const EXECUTION_STATUS_COLORS: Record<ExecutionStatusKey, string> = {
  pending: '#9ca3af',
  completed: '#22c55e',
  partial: '#f59e0b',
  incomplete: '#ef4444',
  scheduled: '#93c5fd',
};

const EXECUTION_STATUS_ORDER: ExecutionStatusKey[] = [
  'completed',
  'partial',
  'incomplete',
  'pending',
  'scheduled',
];

const WEEKDAY_CHART_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

const INPUT_MODE_LABELS: Record<InputModeSummaryEntry['mode'], string> = {
  direct: '직접입력',
  timer: '타이머',
  unknown: '미지정',
};

function getWeekdayIndex(date: string): number {
  return new Date(`${date}T12:00:00`).getDay();
}

function getIsoWeekKey(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  const day = parsed.getDay() || 7;
  parsed.setDate(parsed.getDate() + 4 - day);
  const yearStart = new Date(parsed.getFullYear(), 0, 1);
  const week = Math.ceil(((parsed.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${parsed.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function formatWeekLabel(startDate: string, endDate: string): string {
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  return `${start.getMonth() + 1}/${start.getDate()}~${end.getMonth() + 1}/${end.getDate()}`;
}

function computeStreaks(
  dailyPoints: DailyAchievementPoint[],
  targetThreshold: number
): { currentStreak: number; longestStreak: number } {
  const eligibleDays = dailyPoints.filter((point) => point.plannedMinutes > 0);
  let longestStreak = 0;
  let running = 0;

  for (const point of eligibleDays) {
    const met =
      point.achievementRate != null && point.achievementRate >= targetThreshold;

    if (met) {
      running += 1;
      longestStreak = Math.max(longestStreak, running);
    } else {
      running = 0;
    }
  }

  let currentStreak = 0;

  for (let index = eligibleDays.length - 1; index >= 0; index -= 1) {
    const point = eligibleDays[index];
    const met =
      point.achievementRate != null && point.achievementRate >= targetThreshold;

    if (!met) {
      break;
    }

    currentStreak += 1;
  }

  return { currentStreak, longestStreak };
}

function computeDeltaPercent(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }

  return Math.round(((current - previous) / previous) * 100);
}

function formatChartDateLabel(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  return `${parsed.getMonth() + 1}/${parsed.getDate()} (${WEEKDAY_LABELS[parsed.getDay()]})`;
}

export function listDatesInRange(rangeStart: string, rangeEnd: string): string[] {
  const dates: string[] = [];
  let current = rangeStart;

  while (current <= rangeEnd) {
    dates.push(current);
    current = shiftIsoDate(current, 1);
  }

  return dates;
}

function createSubjectMinuteMap(): Record<string, number> {
  return {};
}

function filterEventsInRange(
  events: ExpandedStudyPlanTodoEvent[],
  rangeStart: string,
  rangeEnd: string
): ExpandedStudyPlanTodoEvent[] {
  if (rangeStart > rangeEnd) {
    return [];
  }

  return events.filter(
    (event) => event.date >= rangeStart && event.date <= rangeEnd
  );
}

function clampStatsRangeEndToAsOf(rangeEnd: string, asOfDate: string): string {
  return rangeEnd <= asOfDate ? rangeEnd : asOfDate;
}

export function resolveEffectiveStatsRange(
  rangeStart: string,
  rangeEnd: string,
  asOfDate: string = getTodayIsoDate()
): EffectiveStatsRange {
  const isNotStartedYet = rangeStart > asOfDate;
  const hasFuturePortion = rangeEnd > asOfDate;
  const performanceStart = rangeStart;
  const performanceEnd = isNotStartedYet
    ? shiftIsoDate(rangeStart, -1)
    : clampStatsRangeEndToAsOf(rangeEnd, asOfDate);

  return {
    fullStart: rangeStart,
    fullEnd: rangeEnd,
    performanceStart,
    performanceEnd,
    asOfDate,
    hasFuturePortion,
    isNotStartedYet,
  };
}

export function isPerformanceStatsRangeValid(range: EffectiveStatsRange): boolean {
  return !range.isNotStartedYet && range.performanceStart <= range.performanceEnd;
}

function resolveExecutionStatusKey(
  eventDate: string,
  execution: ReturnType<typeof getExecutionRecord>,
  asOfDate: string
): ExecutionStatusKey {
  if (eventDate > asOfDate) {
    return 'scheduled';
  }

  return execution?.status ?? 'pending';
}

function isMissedExecutionStatus(status: ExecutionStatusKey): boolean {
  return status !== 'completed' && status !== 'scheduled';
}

function hasAchievementLevel(
  execution: ReturnType<typeof getExecutionRecord>
): execution is NonNullable<ReturnType<typeof getExecutionRecord>> & {
  achievementLevel: number;
} {
  return (
    execution != null &&
    execution.status !== 'incomplete' &&
    execution.achievementLevel != null
  );
}

function roundAverageLevel(totalLevel: number, count: number): number | null {
  if (count <= 0) {
    return null;
  }

  return Math.round((totalLevel / count) * 10) / 10;
}

function toSubjectEntries(
  map: Record<string, number>,
  subjects?: ProfileSubjectsInput
): SubjectMinutesEntry[] {
  return Object.entries(map)
    .filter(([, minutes]) => minutes > 0)
    .map(([subject, minutes]) => ({
      subject,
      label: getSubjectLabel(subject, subjects),
      minutes,
      color: getSubjectChartColor(subject, subjects),
    }));
}

export function getLast7DaysRange(endDate?: string): { start: string; end: string } {
  const end = endDate ?? getTodayIsoDate();
  return { start: shiftIsoDate(end, -6), end };
}

/** 백엔드 start/end API는 end가 배타적이므로, UI 종료일(포함)을 API end로 변환 */
export function toExclusiveApiRangeEnd(inclusiveEnd: string): string {
  return shiftIsoDate(inclusiveEnd, 1);
}

export function isValidDateRange(start: string, end: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(start) &&
    /^\d{4}-\d{2}-\d{2}$/.test(end) &&
    start <= end
  );
}

export function aggregateSubjectComparison(
  events: ExpandedStudyPlanTodoEvent[],
  todosById: Map<number, StudyPlanTodo>,
  rangeStart: string,
  rangeEnd: string,
  subjects?: ProfileSubjectsInput
): SubjectComparisonEntry[] {
  const summary = aggregateStudyStats(
    events,
    todosById,
    rangeStart,
    rangeEnd,
    subjects
  );

  const plannedMap = new Map(
    summary.bySubjectPlanned.map((entry) => [entry.subject, entry])
  );
  const executedMap = new Map(
    summary.bySubjectExecuted.map((entry) => [entry.subject, entry])
  );

  const subjectKeys = new Set<PlanSubjectKey>([
    ...plannedMap.keys(),
    ...executedMap.keys(),
  ]);

  return Array.from(subjectKeys)
    .map((subject) => {
      const planned = plannedMap.get(subject);
      const executed = executedMap.get(subject);
      const plannedMinutes = planned?.minutes ?? 0;
      const executedMinutes = executed?.minutes ?? 0;

      return {
        subject,
        label: planned?.label ?? executed?.label ?? getSubjectLabel(subject, subjects),
        color: planned?.color ?? executed?.color ?? getSubjectChartColor(subject, subjects),
        plannedMinutes,
        executedMinutes,
        achievementRate:
          plannedMinutes > 0
            ? Math.round((executedMinutes / plannedMinutes) * 100)
            : null,
      };
    })
    .filter((entry) => entry.plannedMinutes > 0 || entry.executedMinutes > 0)
    .sort((a, b) => b.plannedMinutes - a.plannedMinutes);
}

export function aggregatePeriodAchievementRates(
  events: ExpandedStudyPlanTodoEvent[],
  todosById: Map<number, StudyPlanTodo>,
  rangeStart: string,
  rangeEnd: string
): PeriodAchievementRates {
  const rangeEvents = filterEventsInRange(events, rangeStart, rangeEnd);
  const totalTodos = rangeEvents.length;
  let executedTodos = 0;
  let plannedMinutes = 0;
  let executedMinutes = 0;

  for (const event of rangeEvents) {
    const plannedDuration = durationBetweenIso(event.start, event.end);

    if (plannedDuration > 0) {
      plannedMinutes += plannedDuration;
    }

    const execution = getExecutionRecord(todosById.get(event.todoId), event.date);

    if (isExecutedOnTimeline(execution)) {
      executedTodos += 1;

      const executedDuration = durationBetweenTimes(
        execution.executedStartTime,
        execution.executedEndTime
      );

      if (executedDuration > 0) {
        executedMinutes += executedDuration;
      }
    }
  }

  return {
    totalTodos,
    executedTodos,
    countRate:
      totalTodos > 0 ? Math.round((executedTodos / totalTodos) * 100) : null,
    plannedMinutes,
    executedMinutes,
    timeRate:
      plannedMinutes > 0
        ? Math.round((executedMinutes / plannedMinutes) * 100)
        : null,
  };
}

export function aggregateExecutionStatusDistribution(
  events: ExpandedStudyPlanTodoEvent[],
  todosById: Map<number, StudyPlanTodo>,
  rangeStart: string,
  rangeEnd: string,
  asOfDate: string = getTodayIsoDate()
): ExecutionStatusDistribution {
  const counts: Record<ExecutionStatusKey, number> = {
    pending: 0,
    completed: 0,
    partial: 0,
    incomplete: 0,
    scheduled: 0,
  };

  for (const event of filterEventsInRange(events, rangeStart, rangeEnd)) {
    const status = resolveExecutionStatusKey(
      event.date,
      getExecutionRecord(todosById.get(event.todoId), event.date),
      asOfDate
    );
    counts[status] += 1;
  }

  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return {
    total,
    entries: EXECUTION_STATUS_ORDER.map((status) => ({
      status,
      label: EXECUTION_STATUS_LABELS[status],
      count: counts[status],
      color: EXECUTION_STATUS_COLORS[status],
    })).filter((entry) => entry.count > 0),
  };
}

export function aggregateAchievementLevelSummary(
  events: ExpandedStudyPlanTodoEvent[],
  todosById: Map<number, StudyPlanTodo>,
  rangeStart: string,
  rangeEnd: string,
  subjects?: ProfileSubjectsInput
): AchievementLevelSummary {
  const levelSumBySubject = createSubjectMinuteMap();
  const countBySubject = createSubjectMinuteMap();
  let overallLevelSum = 0;
  let overallCount = 0;

  for (const event of filterEventsInRange(events, rangeStart, rangeEnd)) {
    const execution = getExecutionRecord(todosById.get(event.todoId), event.date);

    if (!hasAchievementLevel(execution)) {
      continue;
    }

    levelSumBySubject[event.subject] =
      (levelSumBySubject[event.subject] ?? 0) + execution.achievementLevel;
    countBySubject[event.subject] = (countBySubject[event.subject] ?? 0) + 1;
    overallLevelSum += execution.achievementLevel;
    overallCount += 1;
  }

  const bySubject = Object.keys(countBySubject)
    .map((subject) => {
      const recordCount = countBySubject[subject] ?? 0;
      const averageLevel = roundAverageLevel(
        levelSumBySubject[subject] ?? 0,
        recordCount
      );

      return {
        subject,
        label: getSubjectLabel(subject, subjects),
        averageLevel,
        averageRate:
          averageLevel != null ? Math.round(averageLevel * 10) : null,
        recordCount,
      };
    })
    .sort((a, b) => b.recordCount - a.recordCount);

  const overallAverageLevel = roundAverageLevel(overallLevelSum, overallCount);

  return {
    overallAverageLevel,
    overallAverageRate:
      overallAverageLevel != null ? Math.round(overallAverageLevel * 10) : null,
    recordCount: overallCount,
    bySubject,
  };
}

export function aggregateStudyStatsKpi(
  events: ExpandedStudyPlanTodoEvent[],
  todosById: Map<number, StudyPlanTodo>,
  rangeStart: string,
  rangeEnd: string,
  targetThreshold = STUDY_STATS_TARGET_ACHIEVEMENT_THRESHOLD
): StudyStatsKpiSummary {
  const dailyPoints = aggregateDailyAchievementRates(
    events,
    todosById,
    rangeStart,
    rangeEnd
  );

  const plannedDays = dailyPoints.filter((point) => point.plannedMinutes > 0).length;
  const studiedDays = dailyPoints.filter((point) => point.executedMinutes > 0).length;
  const executedTotalOnStudiedDays = dailyPoints.reduce(
    (total, point) => total + point.executedMinutes,
    0
  );
  const targetMetDays = dailyPoints.filter(
    (point) =>
      point.plannedMinutes > 0 &&
      point.achievementRate != null &&
      point.achievementRate >= targetThreshold
  ).length;
  const { currentStreak, longestStreak } = computeStreaks(
    dailyPoints,
    targetThreshold
  );

  return {
    plannedDays,
    studiedDays,
    averageExecutedMinutesOnStudiedDays:
      studiedDays > 0
        ? Math.round(executedTotalOnStudiedDays / studiedDays)
        : null,
    targetMetDays,
    targetMetRate:
      plannedDays > 0 ? Math.round((targetMetDays / plannedDays) * 100) : null,
    currentStreak,
    longestStreak,
  };
}

export function aggregateStudyStats(
  events: ExpandedStudyPlanTodoEvent[],
  todosById: Map<number, StudyPlanTodo>,
  rangeStart: string,
  rangeEnd: string,
  subjects?: ProfileSubjectsInput
): StudyStatsSummary {
  const plannedBySubject = createSubjectMinuteMap();
  const executedBySubject = createSubjectMinuteMap();

  for (const event of filterEventsInRange(events, rangeStart, rangeEnd)) {
    const plannedDuration = durationBetweenIso(event.start, event.end);
    if (plannedDuration > 0) {
      plannedBySubject[event.subject] = (plannedBySubject[event.subject] ?? 0) + plannedDuration;
    }

    const execution = getExecutionRecord(todosById.get(event.todoId), event.date);
    if (isExecutedOnTimeline(execution)) {
      const executedDuration = durationBetweenTimes(
        execution.executedStartTime,
        execution.executedEndTime
      );

      if (executedDuration > 0) {
        executedBySubject[event.subject] =
          (executedBySubject[event.subject] ?? 0) + executedDuration;
      }
    }
  }

  const totalPlannedMinutes = Object.values(plannedBySubject).reduce(
    (total, minutes) => total + minutes,
    0
  );
  const totalExecutedMinutes = Object.values(executedBySubject).reduce(
    (total, minutes) => total + minutes,
    0
  );

  return {
    bySubjectPlanned: toSubjectEntries(plannedBySubject, subjects),
    bySubjectExecuted: toSubjectEntries(executedBySubject, subjects),
    totalPlannedMinutes,
    totalExecutedMinutes,
  };
}

export function aggregateDailyAchievementRates(
  events: ExpandedStudyPlanTodoEvent[],
  todosById: Map<number, StudyPlanTodo>,
  rangeStart: string,
  rangeEnd: string
): DailyAchievementPoint[] {
  return listDatesInRange(rangeStart, rangeEnd).map((date) => {
    const plannedMinutes = calculatePlannedStudyMinutes(events, date);
    const executedMinutes = calculateExecutedStudyMinutes(events, date, todosById);
    const achievementRate =
      plannedMinutes > 0
        ? Math.round((executedMinutes / plannedMinutes) * 100)
        : null;

    return {
      date,
      label: formatChartDateLabel(date),
      plannedMinutes,
      executedMinutes,
      achievementRate,
    };
  });
}

export function aggregateWeekdayPatterns(
  events: ExpandedStudyPlanTodoEvent[],
  todosById: Map<number, StudyPlanTodo>,
  rangeStart: string,
  rangeEnd: string
): WeekdayPatternEntry[] {
  const buckets = new Map<
    number,
    { dayCount: number; plannedMinutes: number; executedMinutes: number }
  >();

  for (const date of listDatesInRange(rangeStart, rangeEnd)) {
    const weekday = getWeekdayIndex(date);
    const plannedMinutes = calculatePlannedStudyMinutes(events, date);
    const executedMinutes = calculateExecutedStudyMinutes(events, date, todosById);

    if (plannedMinutes <= 0 && executedMinutes <= 0) {
      continue;
    }

    const bucket = buckets.get(weekday) ?? {
      dayCount: 0,
      plannedMinutes: 0,
      executedMinutes: 0,
    };

    bucket.dayCount += 1;
    bucket.plannedMinutes += plannedMinutes;
    bucket.executedMinutes += executedMinutes;
    buckets.set(weekday, bucket);
  }

  return WEEKDAY_CHART_ORDER.map((weekday) => {
    const bucket = buckets.get(weekday) ?? {
      dayCount: 0,
      plannedMinutes: 0,
      executedMinutes: 0,
    };

    return {
      weekday,
      label: WEEKDAY_LABELS[weekday],
      dayCount: bucket.dayCount,
      plannedMinutes: bucket.plannedMinutes,
      executedMinutes: bucket.executedMinutes,
      averagePlannedMinutes:
        bucket.dayCount > 0
          ? Math.round(bucket.plannedMinutes / bucket.dayCount)
          : null,
      averageExecutedMinutes:
        bucket.dayCount > 0
          ? Math.round(bucket.executedMinutes / bucket.dayCount)
          : null,
      achievementRate:
        bucket.plannedMinutes > 0
          ? Math.round((bucket.executedMinutes / bucket.plannedMinutes) * 100)
          : null,
    };
  });
}

export function aggregateWeeklyAchievementTrend(
  events: ExpandedStudyPlanTodoEvent[],
  todosById: Map<number, StudyPlanTodo>,
  rangeStart: string,
  rangeEnd: string
): WeeklyAchievementPoint[] {
  const dailyPoints = aggregateDailyAchievementRates(
    events,
    todosById,
    rangeStart,
    rangeEnd
  );

  const weekMap = new Map<
    string,
    {
      startDate: string;
      endDate: string;
      plannedMinutes: number;
      executedMinutes: number;
    }
  >();

  for (const point of dailyPoints) {
    if (point.plannedMinutes <= 0 && point.executedMinutes <= 0) {
      continue;
    }

    const weekKey = getIsoWeekKey(point.date);
    const existing = weekMap.get(weekKey);

    if (!existing) {
      weekMap.set(weekKey, {
        startDate: point.date,
        endDate: point.date,
        plannedMinutes: point.plannedMinutes,
        executedMinutes: point.executedMinutes,
      });
      continue;
    }

    existing.startDate =
      point.date < existing.startDate ? point.date : existing.startDate;
    existing.endDate =
      point.date > existing.endDate ? point.date : existing.endDate;
    existing.plannedMinutes += point.plannedMinutes;
    existing.executedMinutes += point.executedMinutes;
  }

  const weeklyPoints = Array.from(weekMap.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([weekKey, bucket]) => ({
      weekKey,
      label: formatWeekLabel(bucket.startDate, bucket.endDate),
      startDate: bucket.startDate,
      endDate: bucket.endDate,
      plannedMinutes: bucket.plannedMinutes,
      executedMinutes: bucket.executedMinutes,
      achievementRate:
        bucket.plannedMinutes > 0
          ? Math.round((bucket.executedMinutes / bucket.plannedMinutes) * 100)
          : null,
      movingAverageRate: null as number | null,
      movingAverageExecutedMinutes: null as number | null,
    }));

  for (let index = 0; index < weeklyPoints.length; index += 1) {
    const windowStart = Math.max(0, index - 6);
    const window = weeklyPoints.slice(windowStart, index + 1);
    const plannedTotal = window.reduce(
      (total, point) => total + point.plannedMinutes,
      0
    );
    const executedTotal = window.reduce(
      (total, point) => total + point.executedMinutes,
      0
    );

    weeklyPoints[index].movingAverageRate =
      plannedTotal > 0 ? Math.round((executedTotal / plannedTotal) * 100) : null;
    weeklyPoints[index].movingAverageExecutedMinutes =
      window.length > 0 ? Math.round(executedTotal / window.length) : null;
  }

  return weeklyPoints;
}

export function aggregatePeriodComparison(
  events: ExpandedStudyPlanTodoEvent[],
  todosById: Map<number, StudyPlanTodo>,
  currentStart: string,
  currentEnd: string,
  previousStart: string | null,
  previousEnd: string | null,
  previousLabel: string | null,
  comparisonKindLabel: string | null = null,
  asOfDate: string = getTodayIsoDate()
): PeriodComparisonSummary {
  const currentPerformanceEnd = clampStatsRangeEndToAsOf(currentEnd, asOfDate);
  const currentRates =
    currentStart > currentPerformanceEnd
      ? {
          totalTodos: 0,
          executedTodos: 0,
          countRate: null,
          plannedMinutes: 0,
          executedMinutes: 0,
          timeRate: null,
        }
      : aggregatePeriodAchievementRates(
          events,
          todosById,
          currentStart,
          currentPerformanceEnd
        );

  if (!previousStart || !previousEnd) {
    return {
      comparisonKindLabel: null,
      previousLabel: null,
      previousStart: null,
      previousEnd: null,
      currentRates,
      previousRates: null,
      executedMinutesDelta: null,
      executedMinutesDeltaPercent: null,
      timeRateDelta: null,
      countRateDelta: null,
    };
  }

  const previousPerformanceEnd = clampStatsRangeEndToAsOf(previousEnd, asOfDate);
  const previousRates =
    previousStart > previousPerformanceEnd
      ? {
          totalTodos: 0,
          executedTodos: 0,
          countRate: null,
          plannedMinutes: 0,
          executedMinutes: 0,
          timeRate: null,
        }
      : aggregatePeriodAchievementRates(
          events,
          todosById,
          previousStart,
          previousPerformanceEnd
        );

  return {
    comparisonKindLabel,
    previousLabel,
    previousStart,
    previousEnd,
    currentRates,
    previousRates,
    executedMinutesDelta:
      currentRates.executedMinutes - previousRates.executedMinutes,
    executedMinutesDeltaPercent: computeDeltaPercent(
      currentRates.executedMinutes,
      previousRates.executedMinutes
    ),
    timeRateDelta:
      currentRates.timeRate != null && previousRates.timeRate != null
        ? currentRates.timeRate - previousRates.timeRate
        : null,
    countRateDelta:
      currentRates.countRate != null && previousRates.countRate != null
        ? currentRates.countRate - previousRates.countRate
        : null,
  };
}

export function aggregateRemainingPlanSummary(
  events: ExpandedStudyPlanTodoEvent[],
  rangeStart: string,
  rangeEnd: string,
  asOfDate: string = getTodayIsoDate()
): RemainingPlanSummary {
  if (rangeEnd <= asOfDate) {
    return {
      remainingStart: null,
      remainingEnd: null,
      remainingDays: 0,
      plannedMinutes: 0,
      totalTodos: 0,
    };
  }

  const remainingStartCandidate = shiftIsoDate(asOfDate, 1);
  const remainingStart =
    remainingStartCandidate < rangeStart ? rangeStart : remainingStartCandidate;
  const remainingEnd = rangeEnd;

  if (remainingStart > remainingEnd) {
    return {
      remainingStart: null,
      remainingEnd: null,
      remainingDays: 0,
      plannedMinutes: 0,
      totalTodos: 0,
    };
  }

  const remainingEvents = filterEventsInRange(
    events,
    remainingStart,
    remainingEnd
  );
  let plannedMinutes = 0;

  for (const event of remainingEvents) {
    const plannedDuration = durationBetweenIso(event.start, event.end);

    if (plannedDuration > 0) {
      plannedMinutes += plannedDuration;
    }
  }

  return {
    remainingStart,
    remainingEnd,
    remainingDays: listDatesInRange(remainingStart, remainingEnd).length,
    plannedMinutes,
    totalTodos: remainingEvents.length,
  };
}

export function aggregateMissedTodoRanking(
  events: ExpandedStudyPlanTodoEvent[],
  todosById: Map<number, StudyPlanTodo>,
  rangeStart: string,
  rangeEnd: string,
  subjects?: ProfileSubjectsInput,
  limit = 5,
  asOfDate: string = getTodayIsoDate()
): MissedTodoRankingEntry[] {
  const counts = new Map<
    number,
    {
      subject: PlanSubjectKey;
      title: string;
      missedCount: number;
      totalCount: number;
    }
  >();

  for (const event of filterEventsInRange(events, rangeStart, rangeEnd)) {
    if (event.date > asOfDate) {
      continue;
    }

    const execution = getExecutionRecord(todosById.get(event.todoId), event.date);
    const status = resolveExecutionStatusKey(event.date, execution, asOfDate);

    const existing = counts.get(event.todoId) ?? {
      subject: event.subject,
      title: event.title,
      missedCount: 0,
      totalCount: 0,
    };

    existing.totalCount += 1;

    if (isMissedExecutionStatus(status)) {
      existing.missedCount += 1;
    }

    counts.set(event.todoId, existing);
  }

  return Array.from(counts.entries())
    .filter(([, entry]) => entry.missedCount > 0)
    .map(([todoId, entry]) => ({
      todoId,
      subject: entry.subject,
      label: getSubjectLabel(entry.subject, subjects),
      title: entry.title,
      missedCount: entry.missedCount,
      totalCount: entry.totalCount,
    }))
    .sort((left, right) => {
      if (right.missedCount !== left.missedCount) {
        return right.missedCount - left.missedCount;
      }

      return left.title.localeCompare(right.title, 'ko');
    })
    .slice(0, limit);
}

export function aggregateExecutionTimeDeviations(
  events: ExpandedStudyPlanTodoEvent[],
  todosById: Map<number, StudyPlanTodo>,
  rangeStart: string,
  rangeEnd: string,
  subjects?: ProfileSubjectsInput,
  limit = 5
): ExecutionDeviationEntry[] {
  const deviations = new Map<
    number,
    ExecutionDeviationEntry
  >();

  for (const event of filterEventsInRange(events, rangeStart, rangeEnd)) {
    const execution = getExecutionRecord(todosById.get(event.todoId), event.date);
    const plannedMinutes = durationBetweenIso(event.start, event.end);

    if (!isExecutedOnTimeline(execution) || plannedMinutes <= 0) {
      continue;
    }

    const executedMinutes = durationBetweenTimes(
      execution.executedStartTime,
      execution.executedEndTime
    );

    if (executedMinutes <= 0) {
      continue;
    }

    const existing = deviations.get(event.todoId) ?? {
      todoId: event.todoId,
      subject: event.subject,
      label: getSubjectLabel(event.subject, subjects),
      title: event.title,
      plannedMinutes: 0,
      executedMinutes: 0,
      deviationMinutes: 0,
    };

    existing.plannedMinutes += plannedMinutes;
    existing.executedMinutes += executedMinutes;
    existing.deviationMinutes += executedMinutes - plannedMinutes;
    deviations.set(event.todoId, existing);
  }

  return Array.from(deviations.values())
    .sort(
      (left, right) =>
        Math.abs(right.deviationMinutes) - Math.abs(left.deviationMinutes)
    )
    .slice(0, limit);
}

export function aggregateSubjectQualityMatrix(
  subjectComparison: SubjectComparisonEntry[],
  achievementLevel: AchievementLevelSummary
): SubjectQualityEntry[] {
  const qualityBySubject = new Map(
    achievementLevel.bySubject.map((entry) => [entry.subject, entry])
  );

  return subjectComparison
    .map((entry) => {
      const quality = qualityBySubject.get(entry.subject);

      return {
        subject: entry.subject,
        label: entry.label,
        color: entry.color,
        timeAchievementRate: entry.achievementRate,
        qualityRate: quality?.averageRate ?? null,
      };
    })
    .filter(
      (entry) => entry.timeAchievementRate != null || entry.qualityRate != null
    );
}

export function aggregateInputModeSummary(
  events: ExpandedStudyPlanTodoEvent[],
  todosById: Map<number, StudyPlanTodo>,
  rangeStart: string,
  rangeEnd: string
): InputModeSummaryEntry[] {
  const buckets: Record<
    InputModeSummaryEntry['mode'],
    { count: number; levelSum: number; levelCount: number }
  > = {
    direct: { count: 0, levelSum: 0, levelCount: 0 },
    timer: { count: 0, levelSum: 0, levelCount: 0 },
    unknown: { count: 0, levelSum: 0, levelCount: 0 },
  };

  for (const event of filterEventsInRange(events, rangeStart, rangeEnd)) {
    const execution = getExecutionRecord(todosById.get(event.todoId), event.date);

    if (!isExecutedOnTimeline(execution)) {
      continue;
    }

    const mode: InputModeSummaryEntry['mode'] =
      execution.inputMode === 'direct' || execution.inputMode === 'timer'
        ? execution.inputMode
        : 'unknown';

    buckets[mode].count += 1;

    if (hasAchievementLevel(execution)) {
      buckets[mode].levelSum += execution.achievementLevel;
      buckets[mode].levelCount += 1;
    }
  }

  return (['timer', 'direct', 'unknown'] as const)
    .map((mode) => {
      const bucket = buckets[mode];
      const averageLevel = roundAverageLevel(bucket.levelSum, bucket.levelCount);

      return {
        mode,
        label: INPUT_MODE_LABELS[mode],
        count: bucket.count,
        averageLevel,
        averageRate:
          averageLevel != null ? Math.round(averageLevel * 10) : null,
      };
    })
    .filter((entry) => entry.count > 0);
}

export function aggregateSubjectImbalance(
  subjectComparison: SubjectComparisonEntry[]
): SubjectImbalanceEntry[] {
  const totalPlanned = subjectComparison.reduce(
    (total, entry) => total + entry.plannedMinutes,
    0
  );
  const totalExecuted = subjectComparison.reduce(
    (total, entry) => total + entry.executedMinutes,
    0
  );

  if (totalPlanned <= 0) {
    return [];
  }

  return subjectComparison
    .map((entry) => {
      const plannedShare = Math.round((entry.plannedMinutes / totalPlanned) * 100);
      const executedShare =
        totalExecuted > 0
          ? Math.round((entry.executedMinutes / totalExecuted) * 100)
          : 0;

      return {
        subject: entry.subject,
        label: entry.label,
        color: entry.color,
        plannedShare,
        executedShare,
        gapPoints: executedShare - plannedShare,
      };
    })
    .sort((left, right) => left.gapPoints - right.gapPoints);
}
