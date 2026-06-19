'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatDurationMinutes } from '@/lib/day-timeline';
import type { SubjectMinutesEntry } from '@/lib/study-stats';

interface SubjectDonutChartProps {
  title: string;
  data: SubjectMinutesEntry[];
  totalMinutes: number;
  emptyMessage: string;
  loading?: boolean;
}

function formatPercent(minutes: number, total: number): string {
  if (total <= 0) {
    return '0%';
  }

  return `${Math.round((minutes / total) * 100)}%`;
}

function formatDonutTooltip(
  value: unknown,
  _name: unknown,
  item: { payload?: SubjectMinutesEntry },
  totalMinutes: number
): [string, string] {
  const minutes = Number(value ?? 0);
  const label = item.payload?.label ?? '';

  return [
    `${formatDurationMinutes(minutes)} (${formatPercent(minutes, totalMinutes)})`,
    label,
  ];
}

export default function SubjectDonutChart({
  title,
  data,
  totalMinutes,
  emptyMessage,
  loading = false,
}: SubjectDonutChartProps) {
  return (
    <section className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h2>

      {loading ? (
        <div className="mt-4 flex flex-1 items-center justify-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">불러오는 중...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="mt-4 flex flex-1 items-center justify-center">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">{emptyMessage}</p>
        </div>
      ) : (
        <>
          <div className="mt-2 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="minutes"
                  nameKey="label"
                  innerRadius={58}
                  outerRadius={88}
                  paddingAngle={2}
                  stroke="none"
                >
                  {data.map((entry) => (
                    <Cell key={entry.subject} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name, item) =>
                    formatDonutTooltip(value, name, item, totalMinutes)
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className="mt-2 space-y-1">
            {data.map((entry) => (
              <li
                key={entry.subject}
                className="flex items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-300"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="truncate">{entry.label}</span>
                </span>
                <span className="flex shrink-0 items-center gap-3 tabular-nums">
                  <span>{formatDurationMinutes(entry.minutes)}</span>
                  <span className="min-w-[2.75rem] text-right font-medium text-gray-900 dark:text-gray-100">
                    {formatPercent(entry.minutes, totalMinutes)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-4 border-t border-gray-100 pt-3 text-sm text-gray-700 dark:border-neutral-800 dark:text-gray-200">
        합계{' '}
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {formatDurationMinutes(totalMinutes)}
        </span>
      </p>
    </section>
  );
}
