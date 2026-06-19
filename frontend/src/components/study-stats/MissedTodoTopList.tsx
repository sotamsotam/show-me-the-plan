'use client';

import { formatRatePercent } from '@/lib/rate-bar';
import type { MissedTodoRankingEntry } from '@/lib/study-stats';

interface MissedTodoTopListProps {
  data: MissedTodoRankingEntry[];
  loading?: boolean;
}

export default function MissedTodoTopList({
  data,
  loading = false,
}: MissedTodoTopListProps) {
  return (
    <section className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        자주 미달성 TODO
      </h2>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        오늘까지 경과한 TODO 중 실행완료가 아닌 항목 상위 목록입니다.
      </p>

      {loading ? (
        <div className="mt-4 flex flex-1 items-center justify-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">불러오는 중...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="mt-4 flex flex-1 items-center justify-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            미달성 TODO가 없습니다.
          </p>
        </div>
      ) : (
        <ol className="mt-4 space-y-2">
          {data.map((entry, index) => (
            <li
              key={entry.todoId}
              className="flex items-start justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 dark:bg-zinc-800/60"
            >
              <div className="min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {index + 1}. {entry.label}
                </p>
                <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                  {entry.title}
                </p>
              </div>
              <p className="shrink-0 text-sm tabular-nums text-gray-700 dark:text-gray-200">
                {entry.missedCount}/{entry.totalCount}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
