'use client';

import AchievementLevelBar from '@/components/AchievementLevelBar';
import ExecutionRateBar from '@/components/ExecutionRateBar';
import { formatRatePercent } from '@/lib/rate-bar';
import type { SubjectQualityEntry } from '@/lib/study-stats';

interface SubjectQualityChartProps {
  data: SubjectQualityEntry[];
  loading?: boolean;
}

export default function SubjectQualityChart({
  data,
  loading = false,
}: SubjectQualityChartProps) {
  return (
    <section className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        과목별 질·량 비교
      </h2>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        시간 달성률(량)과 성취도(질)를 과목별로 비교합니다.
      </p>

      {loading ? (
        <div className="mt-4 flex flex-1 items-center justify-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">불러오는 중...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="mt-4 flex flex-1 items-center justify-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            비교할 데이터가 없습니다.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-4">
          {data.map((entry) => (
            <li key={entry.subject}>
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {entry.label}
                </span>
              </div>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-xs text-gray-500 dark:text-gray-400">
                    시간 {formatRatePercent(entry.timeAchievementRate)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <ExecutionRateBar rate={entry.timeAchievementRate} className="max-w-none" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-xs text-gray-500 dark:text-gray-400">
                    성취 {formatRatePercent(entry.qualityRate)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <AchievementLevelBar rate={entry.qualityRate} className="max-w-none" />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
