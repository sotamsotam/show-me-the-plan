'use client';

import { formatDurationMinutes } from '@/lib/day-timeline';
import { formatRatePercent } from '@/lib/rate-bar';
import type { PeriodComparisonSummary } from '@/lib/study-stats';

interface PeriodComparisonSectionProps {
  data: PeriodComparisonSummary;
  loading?: boolean;
}

function formatDelta(value: number | null, suffix = ''): string {
  if (value == null) {
    return '—';
  }

  const sign = value > 0 ? '+' : '';
  return `${sign}${value}${suffix}`;
}

function deltaClass(value: number | null): string {
  if (value == null || value === 0) {
    return 'text-gray-700 dark:text-gray-200';
  }

  return value > 0
    ? 'text-green-700 dark:text-green-300'
    : 'text-red-700 dark:text-red-300';
}

export default function PeriodComparisonSection({
  data,
  loading = false,
}: PeriodComparisonSectionProps) {
  if (loading) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
        <p className="text-sm text-gray-500 dark:text-gray-400">불러오는 중...</p>
      </section>
    );
  }

  if (!data.previousRates || !data.previousLabel) {
    return null;
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        이전 구간 대비
      </h2>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {data.comparisonKindLabel
          ? `동일 유형(${data.comparisonKindLabel}) 구간인 ${data.previousLabel}과 비교한 변화입니다.`
          : `이전 구간(${data.previousLabel})과 비교한 변화입니다.`}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg bg-gray-50 px-4 py-3 dark:bg-zinc-800/60">
          <p className="text-xs text-gray-500 dark:text-gray-400">실행공부 시간</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-gray-900 dark:text-gray-100">
            {formatDurationMinutes(data.currentRates.executedMinutes)}
          </p>
          <p className={`mt-1 text-xs tabular-nums ${deltaClass(data.executedMinutesDelta)}`}>
            {formatDelta(data.executedMinutesDelta, '분')} (
            {formatDelta(data.executedMinutesDeltaPercent, '%')})
          </p>
        </div>

        <div className="rounded-lg bg-gray-50 px-4 py-3 dark:bg-zinc-800/60">
          <p className="text-xs text-gray-500 dark:text-gray-400">시간 달성률</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-gray-900 dark:text-gray-100">
            {formatRatePercent(data.currentRates.timeRate)}
          </p>
          <p className={`mt-1 text-xs tabular-nums ${deltaClass(data.timeRateDelta)}`}>
            {formatDelta(data.timeRateDelta, '%p')}
          </p>
        </div>

        <div className="rounded-lg bg-gray-50 px-4 py-3 dark:bg-zinc-800/60">
          <p className="text-xs text-gray-500 dark:text-gray-400">건수 달성률</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-gray-900 dark:text-gray-100">
            {formatRatePercent(data.currentRates.countRate)}
          </p>
          <p className={`mt-1 text-xs tabular-nums ${deltaClass(data.countRateDelta)}`}>
            {formatDelta(data.countRateDelta, '%p')}
          </p>
        </div>

        <div className="rounded-lg bg-gray-50 px-4 py-3 dark:bg-zinc-800/60">
          <p className="text-xs text-gray-500 dark:text-gray-400">이전 구간 실행</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-gray-900 dark:text-gray-100">
            {formatDurationMinutes(data.previousRates.executedMinutes)}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            달성률 {formatRatePercent(data.previousRates.timeRate)}
          </p>
        </div>
      </div>
    </section>
  );
}
