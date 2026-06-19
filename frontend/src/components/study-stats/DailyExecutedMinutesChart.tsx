'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatDurationMinutes } from '@/lib/day-timeline';
import type { DailyAchievementPoint } from '@/lib/study-stats';

interface DailyExecutedMinutesChartProps {
  data: DailyAchievementPoint[];
  loading?: boolean;
}

export default function DailyExecutedMinutesChart({
  data,
  loading = false,
}: DailyExecutedMinutesChartProps) {
  const chartData = data.filter((point) => point.executedMinutes > 0);
  const maxMinutes = Math.max(...chartData.map((point) => point.executedMinutes), 1);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        일별 실행공부 시간
      </h2>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        하루 실제 공부한 시간(절대량) 추이입니다.
      </p>

      {loading ? (
        <div className="mt-4 flex h-64 items-center justify-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">불러오는 중...</p>
        </div>
      ) : chartData.length === 0 ? (
        <div className="mt-4 flex h-64 items-center justify-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            선택한 기간에 실행 기록이 없습니다.
          </p>
        </div>
      ) : (
        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-gray-200 dark:stroke-neutral-700" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} domain={[0, maxMinutes]} tick={{ fontSize: 11 }} width={40} tickFormatter={(value) => `${value}분`} />
              <Tooltip formatter={(value) => [formatDurationMinutes(Number(value ?? 0)), '실행공부']} />
              <Bar dataKey="executedMinutes" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
