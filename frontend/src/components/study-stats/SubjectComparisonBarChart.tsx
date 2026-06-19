'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatDurationMinutes } from '@/lib/day-timeline';
import { formatRatePercent } from '@/lib/rate-bar';
import type { SubjectComparisonEntry } from '@/lib/study-stats';

interface SubjectComparisonBarChartProps {
  data: SubjectComparisonEntry[];
  loading?: boolean;
}

const BAR_COLORS = {
  planned: '#3b82f6',
  executed: '#22c55e',
} as const;

function formatBarTooltip(value: unknown): [string, string] {
  return [formatDurationMinutes(Number(value ?? 0)), '시간'];
}

export default function SubjectComparisonBarChart({
  data,
  loading = false,
}: SubjectComparisonBarChartProps) {
  const chartData = data.map((entry) => ({
    name: entry.label,
    plannedMinutes: entry.plannedMinutes,
    executedMinutes: entry.executedMinutes,
    achievementRate: entry.achievementRate,
  }));

  const maxMinutes = Math.max(
    ...data.map((entry) => Math.max(entry.plannedMinutes, entry.executedMinutes)),
    1
  );

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        과목별 계획 vs 실행
      </h2>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        과목별 공부계획·실행공부 시간과 달성률을 비교합니다.
      </p>

      {loading ? (
        <div className="mt-4 flex h-64 items-center justify-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">불러오는 중...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="mt-4 flex h-64 items-center justify-center">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            선택한 기간에 공부 기록이 없습니다.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  className="stroke-gray-200 dark:stroke-neutral-700"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={data.length > 4 ? -20 : 0}
                  textAnchor={data.length > 4 ? 'end' : 'middle'}
                  height={data.length > 4 ? 56 : 32}
                />
                <YAxis
                  allowDecimals={false}
                  domain={[0, maxMinutes]}
                  tick={{ fontSize: 11 }}
                  width={40}
                  tickFormatter={(value) => `${value}분`}
                />
                <Tooltip formatter={formatBarTooltip} />
                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                  formatter={(value) =>
                    value === 'plannedMinutes' ? '공부계획' : '실행공부'
                  }
                />
                <Bar
                  dataKey="plannedMinutes"
                  name="plannedMinutes"
                  fill={BAR_COLORS.planned}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
                <Bar
                  dataKey="executedMinutes"
                  name="executedMinutes"
                  fill={BAR_COLORS.executed}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <ul className="mt-4 space-y-2 border-t border-gray-100 pt-3 dark:border-neutral-800">
            {data.map((entry) => (
              <li
                key={entry.subject}
                className="flex items-center justify-between gap-3 text-sm text-gray-700 dark:text-gray-200"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="truncate">{entry.label}</span>
                </span>
                <span className="flex shrink-0 items-center gap-4 tabular-nums text-xs sm:text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    {formatDurationMinutes(entry.plannedMinutes)} →{' '}
                    {formatDurationMinutes(entry.executedMinutes)}
                  </span>
                  <span className="min-w-[3rem] text-right font-semibold text-gray-900 dark:text-gray-100">
                    {formatRatePercent(entry.achievementRate)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
