import { describe, expect, it } from 'vitest';

import {
  aggregateAchievementLevelSummary,
  aggregateExecutionStatusDistribution,
  aggregateMissedTodoRanking,
  aggregatePeriodAchievementRates,
  aggregatePeriodComparison,
  aggregateRemainingPlanSummary,
  aggregateStudyStats,
  aggregateStudyStatsKpi,
  aggregateSubjectComparison,
  aggregateSubjectImbalance,
  aggregateWeekdayPatterns,
  aggregateWeeklyAchievementTrend,
  isPerformanceStatsRangeValid,
  resolveEffectiveStatsRange,
} from '@/lib/study-stats';
import type { ExpandedStudyPlanTodoEvent, StudyPlanTodo } from '@/lib/study-plan-todo';
import { SUBJECT_CHART_COLORS } from '@/lib/study-stats-colors';

function buildTodo(
  id: number,
  executionRecords: StudyPlanTodo['executionRecords'] = {}
): StudyPlanTodo {
  return {
    id,
    subject: 'math',
    title: '수학',
    startTime: '09:00',
    endTime: '10:00',
    recurrenceType: 'once',
    daysOfWeek: [],
    validFrom: null,
    validUntil: null,
    date: '2026-06-15',
    excludedDates: [],
    overrides: {},
    executionRecords,
  };
}

describe('aggregateStudyStats', () => {
  const profileSubjects = [
    { id: 'neis-math1', label: '수학Ⅰ', category: 'math' as const, source: 'neis' as const },
    { id: 'custom-essay', label: '논술', source: 'custom' as const },
  ];

  const events: ExpandedStudyPlanTodoEvent[] = [
    {
      id: '1:2026-06-15',
      todoId: 1,
      subject: 'math',
      title: '레거시 수학',
      start: '2026-06-15T07:00:00.000Z',
      end: '2026-06-15T08:00:00.000Z',
      date: '2026-06-15',
      recurrenceType: 'once',
      hasOverride: false,
    },
    {
      id: '2:2026-06-15',
      todoId: 2,
      subject: 'neis-math1',
      title: 'NEIS 수학',
      start: '2026-06-15T09:00:00.000Z',
      end: '2026-06-15T10:00:00.000Z',
      date: '2026-06-15',
      recurrenceType: 'once',
      hasOverride: false,
    },
    {
      id: '3:2026-06-15',
      todoId: 3,
      subject: 'deleted-id',
      title: '삭제된 과목',
      start: '2026-06-15T11:00:00.000Z',
      end: '2026-06-15T11:30:00.000Z',
      date: '2026-06-15',
      recurrenceType: 'once',
      hasOverride: false,
    },
  ];

  const todosById = new Map<number, StudyPlanTodo>();

  it('labels legacy, profile, and deleted subjects in planned stats', () => {
    const stats = aggregateStudyStats(
      events,
      todosById,
      '2026-06-15',
      '2026-06-15',
      profileSubjects
    );

    const labels = Object.fromEntries(
      stats.bySubjectPlanned.map((entry) => [entry.subject, entry.label])
    );

    expect(labels.math).toBe('수학');
    expect(labels['neis-math1']).toBe('수학Ⅰ');
    expect(labels['deleted-id']).toBe('기타');
  });

  it('uses category colors for legacy and profile subjects', () => {
    const stats = aggregateStudyStats(
      events,
      todosById,
      '2026-06-15',
      '2026-06-15',
      profileSubjects
    );

    const colors = Object.fromEntries(
      stats.bySubjectPlanned.map((entry) => [entry.subject, entry.color])
    );

    expect(colors.math).toBe(SUBJECT_CHART_COLORS.math);
    expect(colors['neis-math1']).toBe(SUBJECT_CHART_COLORS.math);
    expect(colors['deleted-id']).toMatch(/^hsl\(/);
  });
});

describe('study stats aggregations', () => {
  const events: ExpandedStudyPlanTodoEvent[] = [
    {
      id: '1:2026-06-15',
      todoId: 1,
      subject: 'math',
      title: '수학 1',
      start: '2026-06-15T07:00:00.000Z',
      end: '2026-06-15T08:00:00.000Z',
      date: '2026-06-15',
      recurrenceType: 'once',
      hasOverride: false,
    },
    {
      id: '2:2026-06-15',
      todoId: 2,
      subject: 'english',
      title: '영어 1',
      start: '2026-06-15T09:00:00.000Z',
      end: '2026-06-15T10:00:00.000Z',
      date: '2026-06-15',
      recurrenceType: 'once',
      hasOverride: false,
    },
    {
      id: '3:2026-06-16',
      todoId: 3,
      subject: 'math',
      title: '수학 2',
      start: '2026-06-16T07:00:00.000Z',
      end: '2026-06-16T08:30:00.000Z',
      date: '2026-06-16',
      recurrenceType: 'once',
      hasOverride: false,
    },
  ];

  const todosById = new Map<number, StudyPlanTodo>([
    [
      1,
      buildTodo(1, {
        '2026-06-15': {
          status: 'completed',
          executedStartTime: '07:00',
          executedEndTime: '07:30',
          achievementLevel: 8,
        },
      }),
    ],
    [
      2,
      buildTodo(2, {
        '2026-06-15': {
          status: 'incomplete',
        },
      }),
    ],
    [
      3,
      buildTodo(3, {
        '2026-06-16': {
          status: 'partial',
          executedStartTime: '07:00',
          executedEndTime: '08:00',
          achievementLevel: 6,
        },
      }),
    ],
  ]);

  it('aggregates subject comparison with achievement rates', () => {
    const comparison = aggregateSubjectComparison(
      events,
      todosById,
      '2026-06-15',
      '2026-06-16'
    );

    const math = comparison.find((entry) => entry.subject === 'math');
    const english = comparison.find((entry) => entry.subject === 'english');

    expect(math?.plannedMinutes).toBe(150);
    expect(math?.executedMinutes).toBe(90);
    expect(math?.achievementRate).toBe(60);
    expect(english?.plannedMinutes).toBe(60);
    expect(english?.executedMinutes).toBe(0);
    expect(english?.achievementRate).toBe(0);
  });

  it('aggregates count and time achievement rates', () => {
    const rates = aggregatePeriodAchievementRates(
      events,
      todosById,
      '2026-06-15',
      '2026-06-16'
    );

    expect(rates.totalTodos).toBe(3);
    expect(rates.executedTodos).toBe(2);
    expect(rates.countRate).toBe(67);
    expect(rates.plannedMinutes).toBe(210);
    expect(rates.executedMinutes).toBe(90);
    expect(rates.timeRate).toBe(43);
  });

  it('aggregates execution status distribution', () => {
    const distribution = aggregateExecutionStatusDistribution(
      events,
      todosById,
      '2026-06-15',
      '2026-06-16'
    );

    expect(distribution.total).toBe(3);
    expect(distribution.entries).toEqual([
      expect.objectContaining({ status: 'completed', count: 1 }),
      expect.objectContaining({ status: 'partial', count: 1 }),
      expect.objectContaining({ status: 'incomplete', count: 1 }),
    ]);
  });

  it('aggregates achievement level summary', () => {
    const summary = aggregateAchievementLevelSummary(
      events,
      todosById,
      '2026-06-15',
      '2026-06-16'
    );

    expect(summary.recordCount).toBe(2);
    expect(summary.overallAverageLevel).toBe(7);
    expect(summary.overallAverageRate).toBe(70);
    expect(summary.bySubject).toEqual([
      expect.objectContaining({
        subject: 'math',
        averageLevel: 7,
        recordCount: 2,
      }),
    ]);
  });

  it('aggregates KPI summary for studied days and target met days', () => {
    const kpi = aggregateStudyStatsKpi(events, todosById, '2026-06-15', '2026-06-16');

    expect(kpi.plannedDays).toBe(2);
    expect(kpi.studiedDays).toBe(2);
    expect(kpi.averageExecutedMinutesOnStudiedDays).toBe(45);
    expect(kpi.targetMetDays).toBe(0);
    expect(kpi.targetMetRate).toBe(0);
    expect(kpi.currentStreak).toBe(0);
    expect(kpi.longestStreak).toBe(0);
  });

  it('aggregates weekday patterns', () => {
    const patterns = aggregateWeekdayPatterns(
      events,
      todosById,
      '2026-06-15',
      '2026-06-16'
    );

    const monday = patterns.find((entry) => entry.label === '월');
    const tuesday = patterns.find((entry) => entry.label === '화');

    expect(monday?.plannedMinutes).toBe(120);
    expect(monday?.executedMinutes).toBe(30);
    expect(tuesday?.plannedMinutes).toBe(90);
    expect(tuesday?.executedMinutes).toBe(60);
  });

  it('aggregates weekly trend with moving average', () => {
    const weekly = aggregateWeeklyAchievementTrend(
      events,
      todosById,
      '2026-06-15',
      '2026-06-16'
    );

    expect(weekly).toHaveLength(1);
    expect(weekly[0]?.plannedMinutes).toBe(210);
    expect(weekly[0]?.executedMinutes).toBe(90);
    expect(weekly[0]?.achievementRate).toBe(43);
    expect(weekly[0]?.movingAverageRate).toBe(43);
  });

  it('aggregates period comparison against previous range', () => {
    const comparison = aggregatePeriodComparison(
      events,
      todosById,
      '2026-06-16',
      '2026-06-16',
      '2026-06-15',
      '2026-06-15',
      '이전 구간',
      '시험대비',
      '2026-06-16'
    );

    expect(comparison.comparisonKindLabel).toBe('시험대비');
    expect(comparison.previousLabel).toBe('이전 구간');
    expect(comparison.previousRates?.executedMinutes).toBe(30);
    expect(comparison.currentRates.executedMinutes).toBe(60);
    expect(comparison.executedMinutesDelta).toBe(30);
    expect(comparison.executedMinutesDeltaPercent).toBe(100);
  });

  it('aggregates missed todo ranking', () => {
    const ranking = aggregateMissedTodoRanking(
      events,
      todosById,
      '2026-06-15',
      '2026-06-16'
    );

    expect(ranking).toHaveLength(2);
    expect(ranking.map((entry) => entry.todoId).sort()).toEqual([2, 3]);
    expect(ranking.every((entry) => entry.missedCount === 1)).toBe(true);
  });

  it('highlights underperforming subject imbalance', () => {
    const comparison = aggregateSubjectComparison(
      events,
      todosById,
      '2026-06-15',
      '2026-06-16'
    );
    const imbalance = aggregateSubjectImbalance(comparison);
    const english = imbalance.find((entry) => entry.subject === 'english');

    expect(english?.gapPoints).toBeLessThan(0);
  });
});

describe('effective stats range', () => {
  const asOfDate = '2026-06-15';

  it('clamps performance end to as-of date when range includes future', () => {
    const range = resolveEffectiveStatsRange('2026-06-01', '2026-06-30', asOfDate);

    expect(range.performanceEnd).toBe('2026-06-15');
    expect(range.hasFuturePortion).toBe(true);
    expect(isPerformanceStatsRangeValid(range)).toBe(true);
  });

  it('marks not-started ranges as invalid for performance stats', () => {
    const range = resolveEffectiveStatsRange('2026-07-01', '2026-07-31', asOfDate);

    expect(range.isNotStartedYet).toBe(true);
    expect(isPerformanceStatsRangeValid(range)).toBe(false);
  });

  it('excludes future todos from period achievement rates when end is clamped', () => {
    const events: ExpandedStudyPlanTodoEvent[] = [
      {
        id: '1:2026-06-15',
        todoId: 1,
        subject: 'math',
        title: '오늘',
        start: '2026-06-15T07:00:00.000Z',
        end: '2026-06-15T08:00:00.000Z',
        date: '2026-06-15',
        recurrenceType: 'once',
        hasOverride: false,
      },
      {
        id: '2:2026-06-20',
        todoId: 2,
        subject: 'math',
        title: '미래',
        start: '2026-06-20T07:00:00.000Z',
        end: '2026-06-20T09:00:00.000Z',
        date: '2026-06-20',
        recurrenceType: 'once',
        hasOverride: false,
      },
    ];

    const fullRangeRates = aggregatePeriodAchievementRates(
      events,
      new Map(),
      '2026-06-01',
      '2026-06-30'
    );
    const clampedRates = aggregatePeriodAchievementRates(
      events,
      new Map(),
      '2026-06-01',
      asOfDate
    );

    expect(fullRangeRates.totalTodos).toBe(2);
    expect(fullRangeRates.plannedMinutes).toBe(180);
    expect(clampedRates.totalTodos).toBe(1);
    expect(clampedRates.plannedMinutes).toBe(60);
  });

  it('counts future todos as scheduled in execution status distribution', () => {
    const events: ExpandedStudyPlanTodoEvent[] = [
      {
        id: '1:2026-06-15',
        todoId: 1,
        subject: 'math',
        title: '오늘',
        start: '2026-06-15T07:00:00.000Z',
        end: '2026-06-15T08:00:00.000Z',
        date: '2026-06-15',
        recurrenceType: 'once',
        hasOverride: false,
      },
      {
        id: '2:2026-06-20',
        todoId: 2,
        subject: 'english',
        title: '미래',
        start: '2026-06-20T07:00:00.000Z',
        end: '2026-06-20T08:00:00.000Z',
        date: '2026-06-20',
        recurrenceType: 'once',
        hasOverride: false,
      },
    ];

    const distribution = aggregateExecutionStatusDistribution(
      events,
      new Map(),
      '2026-06-01',
      '2026-06-30',
      asOfDate
    );

    expect(distribution.entries).toEqual([
      expect.objectContaining({ status: 'pending', count: 1 }),
      expect.objectContaining({ status: 'scheduled', count: 1 }),
    ]);
  });

  it('aggregates remaining plan summary for future portion only', () => {
    const events: ExpandedStudyPlanTodoEvent[] = [
      {
        id: '2:2026-06-20',
        todoId: 2,
        subject: 'english',
        title: '미래',
        start: '2026-06-20T07:00:00.000Z',
        end: '2026-06-20T08:00:00.000Z',
        date: '2026-06-20',
        recurrenceType: 'once',
        hasOverride: false,
      },
    ];

    const remaining = aggregateRemainingPlanSummary(
      events,
      '2026-06-01',
      '2026-06-30',
      asOfDate
    );

    expect(remaining.remainingStart).toBe('2026-06-16');
    expect(remaining.remainingEnd).toBe('2026-06-30');
    expect(remaining.totalTodos).toBe(1);
    expect(remaining.plannedMinutes).toBe(60);
  });

  it('excludes future todos from missed todo ranking', () => {
    const events: ExpandedStudyPlanTodoEvent[] = [
      {
        id: '2:2026-06-20',
        todoId: 2,
        subject: 'english',
        title: '미래',
        start: '2026-06-20T07:00:00.000Z',
        end: '2026-06-20T08:00:00.000Z',
        date: '2026-06-20',
        recurrenceType: 'once',
        hasOverride: false,
      },
    ];

    const ranking = aggregateMissedTodoRanking(
      events,
      new Map(),
      '2026-06-01',
      '2026-06-30',
      undefined,
      5,
      asOfDate
    );

    expect(ranking).toHaveLength(0);
  });
});
