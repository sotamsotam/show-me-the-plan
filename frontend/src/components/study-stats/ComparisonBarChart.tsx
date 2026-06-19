'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatDurationMinutes } from '@/lib/day-timeline';

interface ComparisonBarChartProps {
  plannedMinutes: number;
  executedMinutes: number;
  loading?: boolean;
}

const BAR_COLORS = {
  planned: '#3b82f6',
  executed: '#22c55e',
} as const;

function formatBarTooltip(value: unknown): [string, string] {
  return [formatDurationMinutes(Number(value ?? 0)), '시간'];
}

export default function ComparisonBarChart({
  plannedMinutes,
  executedMinutes,
  loading = false,
}: ComparisonBarChartProps) {
  const achievementRate =
    plannedMinutes > 0 ? Math.round((executedMinutes / plannedMinutes) * 100) : null;

  const chartData = [
    { name: '공부계획', minutes: plannedMinutes, color: BAR_COLORS.planned },
    { name: '실행공부', minutes: executedMinutes, color: BAR_COLORS.executed },
  ];

  const maxMinutes = Math.max(plannedMinutes, executedMinutes, 1);

  return (
    <section className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        전체 공부시간 비교
      </h2>

      {loading ? (
        <div className="mt-4 flex flex-1 items-center justify-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">불러오는 중...</p>
        </div>
      ) : plannedMinutes === 0 && executedMinutes === 0 ? (
        <div className="mt-4 flex flex-1 items-center justify-center">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            선택한 기간에 공부 기록이 없습니다.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-2 h-56 w-full overflow-visible">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 48, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-gray-200 dark:stroke-neutral-700" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  domain={[0, maxMinutes]}
                  tick={{ fontSize: 11 }}
                  width={36}
                  tickFormatter={(value) => `${value}분`}
                />
                <Tooltip formatter={formatBarTooltip} cursor={{ fill: 'transparent' }} />
                <Bar dataKey="minutes" radius={[6, 6, 0, 0]} maxBarSize={72}>
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                  <LabelList
                    dataKey="minutes"
                    position="top"
                    offset={4}
                    className="fill-gray-700 text-[11px] dark:fill-gray-200"
                    formatter={(value) => {
                      const minutes = Number(value);
                      return minutes > 0 ? formatDurationMinutes(minutes) : '';
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 space-y-2 border-t border-gray-100 pt-3 text-sm dark:border-neutral-800">
            <p className="flex items-center justify-between text-gray-700 dark:text-gray-200">
              <span>공부계획</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {formatDurationMinutes(plannedMinutes)}
              </span>
            </p>
            <p className="flex items-center justify-between text-gray-700 dark:text-gray-200">
              <span>실행공부</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {formatDurationMinutes(executedMinutes)}
              </span>
            </p>
            <p className="flex items-center justify-between text-gray-700 dark:text-gray-200">
              <span>달성률</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {achievementRate != null ? `${achievementRate}%` : '—'}
              </span>
            </p>
          </div>
        </>
      )}
    </section>
  );
}
