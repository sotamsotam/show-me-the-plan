'use client';

import { formatRatePercent } from '@/lib/rate-bar';
import type { InputModeSummaryEntry } from '@/lib/study-stats';

interface InputModeSummaryProps {
  data: InputModeSummaryEntry[];
  loading?: boolean;
}

export default function InputModeSummary({
  data,
  loading = false,
}: InputModeSummaryProps) {
  const total = data.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <section className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        입력 방식
      </h2>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        타이머·직접입력 사용 비율과 방식별 평균 성취도입니다.
      </p>

      {loading ? (
        <div className="mt-4 flex flex-1 items-center justify-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">불러오는 중...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="mt-4 flex flex-1 items-center justify-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            입력 방식 기록이 없습니다.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {data.map((entry) => (
            <li
              key={entry.mode}
              className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-zinc-800/60"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {entry.label}
                </span>
                <span className="text-sm tabular-nums text-gray-700 dark:text-gray-200">
                  {entry.count}건 ({total > 0 ? Math.round((entry.count / total) * 100) : 0}%)
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                평균 성취도 {formatRatePercent(entry.averageRate)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
