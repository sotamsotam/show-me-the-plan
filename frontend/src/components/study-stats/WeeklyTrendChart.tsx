'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatDurationMinutes } from '@/lib/day-timeline';
import { formatRatePercent } from '@/lib/rate-bar';
import type { WeeklyAchievementPoint } from '@/lib/study-stats';

interface WeeklyTrendChartProps {
  data: WeeklyAchievementPoint[];
  loading?: boolean;
}

export default function WeeklyTrendChart({
  data,
  loading = false,
}: WeeklyTrendChartProps) {
  const hasData = data.length > 0;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        주간 추이 · 이동평균
      </h2>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        주별 달성률과 최근 7주 이동평균 달성률입니다.
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
            <LineChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-gray-200 dark:stroke-neutral-700" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={40} tickFormatter={(value) => `${value}%`} />
              <Tooltip
                formatter={(value, name) => {
                  if (name === 'movingAverageExecutedMinutes') {
                    return [formatDurationMinutes(Number(value ?? 0)), '이동평균 실행'];
                  }

                  return [formatRatePercent(Number(value)), String(name)];
                }}
                labelFormatter={(_label, payload) => {
                  const point = payload[0]?.payload as WeeklyAchievementPoint | undefined;
                  if (!point) {
                    return '';
                  }

                  return `${point.label} · 실행 ${formatDurationMinutes(point.executedMinutes)}`;
                }}
              />
              <Line type="monotone" dataKey="achievementRate" name="주간 달성률" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} connectNulls={false} />
              <Line type="monotone" dataKey="movingAverageRate" name="이동평균 달성률" stroke="#22c55e" strokeWidth={2} strokeDasharray="6 4" dot={false} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
