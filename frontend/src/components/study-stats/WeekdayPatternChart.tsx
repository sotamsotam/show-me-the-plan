'use client';

import {
  Bar,
  CartesianGrid,
  Legend,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatDurationMinutes } from '@/lib/day-timeline';
import { formatRatePercent } from '@/lib/rate-bar';
import type { WeekdayPatternEntry } from '@/lib/study-stats';

interface WeekdayPatternChartProps {
  data: WeekdayPatternEntry[];
  loading?: boolean;
}

export default function WeekdayPatternChart({
  data,
  loading = false,
}: WeekdayPatternChartProps) {
  const hasData = data.some(
    (entry) => entry.plannedMinutes > 0 || entry.executedMinutes > 0
  );
  const maxMinutes = Math.max(
    ...data.map((entry) => Math.max(entry.plannedMinutes, entry.executedMinutes)),
    1
  );

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        요일별 패턴
      </h2>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        요일별 계획·실행 시간과 달성률입니다.
      </p>

      {loading ? (
        <div className="mt-4 flex h-64 items-center justify-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">불러오는 중...</p>
        </div>
      ) : !hasData ? (
        <div className="mt-4 flex h-64 items-center justify-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            선택한 기간에 공부 기록이 없습니다.
          </p>
        </div>
      ) : (
        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-gray-200 dark:stroke-neutral-700" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis
                yAxisId="minutes"
                allowDecimals={false}
                domain={[0, maxMinutes]}
                tick={{ fontSize: 11 }}
                width={40}
                tickFormatter={(value) => `${value}분`}
              />
              <YAxis
                yAxisId="rate"
                orientation="right"
                domain={[0, 100]}
                tick={{ fontSize: 11 }}
                width={36}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                formatter={(value, name) => {
                  if (name === 'achievementRate') {
                    return [formatRatePercent(Number(value)), '달성률'];
                  }

                  return [formatDurationMinutes(Number(value ?? 0)), String(name)];
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="minutes" dataKey="plannedMinutes" name="공부계획" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar yAxisId="minutes" dataKey="executedMinutes" name="실행공부" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Line yAxisId="rate" type="monotone" dataKey="achievementRate" name="달성률" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
