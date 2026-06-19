'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatRatePercent } from '@/lib/rate-bar';
import type { ExecutionStatusDistribution } from '@/lib/study-stats';

interface ExecutionStatusChartProps {
  data: ExecutionStatusDistribution;
  loading?: boolean;
}

function formatPercent(count: number, total: number): string {
  if (total <= 0) {
    return '0%';
  }

  return `${Math.round((count / total) * 100)}%`;
}

export default function ExecutionStatusChart({
  data,
  loading = false,
}: ExecutionStatusChartProps) {
  return (
    <section className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        실행 상태 분포
      </h2>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        기간 내 TODO별 실행 상태 비율입니다. 예정은 미래 일정이며 성과 집계에서 제외됩니다.
      </p>

      {loading ? (
        <div className="mt-4 flex flex-1 items-center justify-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">불러오는 중...</p>
        </div>
      ) : data.total === 0 ? (
        <div className="mt-4 flex flex-1 items-center justify-center">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            선택한 기간에 공부계획이 없습니다.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-2 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.entries}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={58}
                  outerRadius={88}
                  paddingAngle={2}
                  stroke="none"
                >
                  {data.entries.map((entry) => (
                    <Cell key={entry.status} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, _name, item) => {
                    const count = Number(value ?? 0);
                    const payload = item.payload as (typeof data.entries)[number];

                    return [
                      `${count}건 (${formatPercent(count, data.total)})`,
                      payload.label,
                    ];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className="mt-2 space-y-1">
            {data.entries.map((entry) => (
              <li
                key={entry.status}
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
                  <span>{entry.count}건</span>
                  <span className="min-w-[2.75rem] text-right font-medium text-gray-900 dark:text-gray-100">
                    {formatPercent(entry.count, data.total)}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-4 border-t border-gray-100 pt-3 text-sm text-gray-700 dark:border-neutral-800 dark:text-gray-200">
            합계{' '}
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {data.total}건
            </span>
          </p>
        </>
      )}
    </section>
  );
}
