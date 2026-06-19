'use client';

import { formatDurationMinutes } from '@/lib/day-timeline';
import type { ExecutionDeviationEntry } from '@/lib/study-stats';

interface ExecutionDeviationSectionProps {
  data: ExecutionDeviationEntry[];
  loading?: boolean;
}

function formatDeviation(minutes: number): string {
  const sign = minutes > 0 ? '+' : '';
  return `${sign}${formatDurationMinutes(Math.abs(minutes))}`;
}

export default function ExecutionDeviationSection({
  data,
  loading = false,
}: ExecutionDeviationSectionProps) {
  return (
    <section className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        계획 대비 시간 편차
      </h2>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        실행 기록이 있는 TODO의 계획 대비 초과·미달 시간입니다.
      </p>

      {loading ? (
        <div className="mt-4 flex flex-1 items-center justify-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">불러오는 중...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="mt-4 flex flex-1 items-center justify-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            편차를 계산할 실행 기록이 없습니다.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {data.map((entry) => (
            <li
              key={entry.todoId}
              className="flex items-start justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 dark:bg-zinc-800/60"
            >
              <div className="min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400">{entry.label}</p>
                <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                  {entry.title}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {formatDurationMinutes(entry.plannedMinutes)} →{' '}
                  {formatDurationMinutes(entry.executedMinutes)}
                </p>
              </div>
              <p
                className={`shrink-0 text-sm font-semibold tabular-nums ${
                  entry.deviationMinutes >= 0
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-red-700 dark:text-red-300'
                }`}
              >
                {formatDeviation(entry.deviationMinutes)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
