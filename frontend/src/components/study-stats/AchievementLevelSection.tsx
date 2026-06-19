'use client';

import AchievementLevelBar from '@/components/AchievementLevelBar';
import { formatRatePercent } from '@/lib/rate-bar';
import type { AchievementLevelSummary } from '@/lib/study-stats';

interface AchievementLevelSectionProps {
  data: AchievementLevelSummary;
  loading?: boolean;
}

export default function AchievementLevelSection({
  data,
  loading = false,
}: AchievementLevelSectionProps) {
  return (
    <section className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        성취도 요약
      </h2>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        실행 기록에 입력한 성취도(1~10)의 평균입니다.
      </p>

      {loading ? (
        <div className="mt-4 flex flex-1 items-center justify-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">불러오는 중...</p>
        </div>
      ) : data.recordCount === 0 ? (
        <div className="mt-4 flex flex-1 items-center justify-center">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            선택한 기간에 성취도 기록이 없습니다.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3 dark:bg-zinc-800/60">
            <p className="text-xs text-gray-500 dark:text-gray-400">전체 평균</p>
            <div className="mt-2 flex items-center gap-4">
              <p className="text-2xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                {data.overallAverageLevel != null
                  ? `${data.overallAverageLevel} / 10`
                  : '-'}
              </p>
              <div className="min-w-0 flex-1">
                <AchievementLevelBar
                  rate={data.overallAverageRate}
                  className="max-w-none"
                />
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {data.recordCount}건 기록
            </p>
          </div>

          {data.bySubject.length > 0 ? (
            <ul className="mt-4 space-y-3 border-t border-gray-100 pt-3 dark:border-neutral-800">
              {data.bySubject.map((entry) => (
                <li key={entry.subject}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-gray-700 dark:text-gray-200">
                      {entry.label}
                    </span>
                    <span className="shrink-0 tabular-nums text-xs text-gray-500 dark:text-gray-400">
                      {entry.recordCount}건
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3">
                    <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                      {formatRatePercent(entry.averageRate)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <AchievementLevelBar
                        rate={entry.averageRate}
                        className="max-w-none"
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </section>
  );
}
