'use client';

import type { ReactNode } from 'react';
import ExecutionRateBar from '@/components/ExecutionRateBar';
import { formatDurationMinutes } from '@/lib/day-timeline';
import { formatRatePercent } from '@/lib/rate-bar';
import type {
  PeriodAchievementRates,
  StudyStatsKpiSummary,
} from '@/lib/study-stats';
import { STUDY_STATS_TARGET_ACHIEVEMENT_THRESHOLD } from '@/lib/study-stats';

interface AchievementSummaryCardsProps {
  rates: PeriodAchievementRates;
  kpi: StudyStatsKpiSummary;
  loading?: boolean;
}

interface SummaryCardProps {
  label: string;
  value: string;
  hint?: string;
  children?: ReactNode;
}

function SummaryCard({ label, value, hint, children }: SummaryCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
        {value}
      </p>
      {children}
      {hint ? (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>
      ) : null}
    </div>
  );
}

export default function AchievementSummaryCards({
  rates,
  kpi,
  loading = false,
}: AchievementSummaryCardsProps) {
  if (loading) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
        <p className="text-sm text-gray-500 dark:text-gray-400">불러오는 중...</p>
      </section>
    );
  }

  const hasData = rates.totalTodos > 0 || rates.executedMinutes > 0;

  if (!hasData) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          선택한 기간에 공부 기록이 없습니다.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="기간 요약">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          label="건수 달성률"
          value={formatRatePercent(rates.countRate)}
          hint={`${rates.executedTodos} / ${rates.totalTodos} TODO 실행`}
        >
          <div className="mt-2">
            <ExecutionRateBar rate={rates.countRate} className="max-w-none" />
          </div>
        </SummaryCard>

        <SummaryCard
          label="시간 달성률"
          value={formatRatePercent(rates.timeRate)}
          hint={`${formatDurationMinutes(rates.executedMinutes)} / ${formatDurationMinutes(rates.plannedMinutes)}`}
        >
          <div className="mt-2">
            <ExecutionRateBar rate={rates.timeRate} className="max-w-none" />
          </div>
        </SummaryCard>

        <SummaryCard
          label="공부한 날"
          value={`${kpi.studiedDays}일`}
          hint={
            kpi.plannedDays > 0
              ? `계획 ${kpi.plannedDays}일 중 · 평균 ${formatDurationMinutes(kpi.averageExecutedMinutesOnStudiedDays ?? 0)}`
              : undefined
          }
        />

        <SummaryCard
          label={`목표 달성일 (${STUDY_STATS_TARGET_ACHIEVEMENT_THRESHOLD}%+)`}
          value={`${kpi.targetMetDays}일`}
          hint={
            kpi.targetMetRate != null
              ? `계획 있는 날 중 ${kpi.targetMetRate}%`
              : undefined
          }
        />

        <SummaryCard
          label="현재 연속 달성"
          value={`${kpi.currentStreak}일`}
          hint="기간 마지막 날 기준 연속 목표 달성"
        />

        <SummaryCard
          label="최장 연속 달성"
          value={`${kpi.longestStreak}일`}
          hint="기간 내 최대 연속 목표 달성"
        />
      </div>
    </section>
  );
}
