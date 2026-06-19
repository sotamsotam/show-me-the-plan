'use client';

import { formatDurationMinutes } from '@/lib/day-timeline';
import type { RemainingPlanSummary } from '@/lib/study-stats';

interface RemainingPlanSummaryCardsProps {
  data: RemainingPlanSummary;
  loading?: boolean;
}

function formatCardDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  return `${parsed.getMonth() + 1}/${parsed.getDate()}`;
}

export default function RemainingPlanSummaryCards({
  data,
  loading = false,
}: RemainingPlanSummaryCardsProps) {
  if (loading || data.totalTodos === 0 || !data.remainingStart || !data.remainingEnd) {
    return null;
  }

  return (
    <section
      aria-label="남은 계획"
      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-zinc-900"
    >
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        남은 계획
      </h2>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {formatCardDate(data.remainingStart)} ~ {formatCardDate(data.remainingEnd)}{' '}
        구간의 예정된 공부계획입니다.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-gray-50 px-4 py-3 dark:bg-zinc-800/60">
          <p className="text-xs text-gray-500 dark:text-gray-400">남은 일수</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
            {data.remainingDays}일
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 px-4 py-3 dark:bg-zinc-800/60">
          <p className="text-xs text-gray-500 dark:text-gray-400">예정 TODO</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
            {data.totalTodos}건
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 px-4 py-3 dark:bg-zinc-800/60">
          <p className="text-xs text-gray-500 dark:text-gray-400">예정 공부시간</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
            {formatDurationMinutes(data.plannedMinutes)}
          </p>
        </div>
      </div>
    </section>
  );
}
