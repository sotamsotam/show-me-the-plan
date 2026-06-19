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
import type { DailyAchievementPoint } from '@/lib/study-stats';

interface AchievementTrendLineChartProps {
  data: DailyAchievementPoint[];
  loading?: boolean;
}

const LINE_COLOR = '#3b82f6';

function formatTrendTooltip(
  value: unknown,
  _name: unknown,
  item: { payload?: DailyAchievementPoint }
): [string, string] {
  const point = item.payload;

  if (!point || point.achievementRate == null) {
    return ['—', '달성률'];
  }

  return [`${point.achievementRate}%`, '달성률'];
}

function formatTrendTooltipLabel(label: unknown, payload: readonly { payload?: DailyAchievementPoint }[]): string {
  const point = payload[0]?.payload;

  if (!point) {
    return String(label ?? '');
  }

  return `${point.date} · 계획 ${formatDurationMinutes(point.plannedMinutes)} · 실행 ${formatDurationMinutes(point.executedMinutes)}`;
}

export default function AchievementTrendLineChart({
  data,
  loading = false,
}: AchievementTrendLineChartProps) {
  const hasPlannedDays = data.some((point) => point.plannedMinutes > 0);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">루틴달성률 추이</h2>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        일별 실행공부 시간 ÷ 공부계획 시간 (공부계획이 있는 날만 표시)
      </p>

      {loading ? (
        <div className="mt-4 flex h-64 items-center justify-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">불러오는 중...</p>
        </div>
      ) : !hasPlannedDays ? (
        <div className="mt-4 flex h-64 items-center justify-center">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            선택한 기간에 공부계획이 있는 날이 없습니다.
          </p>
        </div>
      ) : (
        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                className="stroke-gray-200 dark:stroke-neutral-700"
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11 }}
                width={40}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                formatter={formatTrendTooltip}
                labelFormatter={formatTrendTooltipLabel}
              />
              <Line
                type="monotone"
                dataKey="achievementRate"
                name="달성률"
                stroke={LINE_COLOR}
                strokeWidth={2}
                dot={{ r: 4, fill: LINE_COLOR, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
