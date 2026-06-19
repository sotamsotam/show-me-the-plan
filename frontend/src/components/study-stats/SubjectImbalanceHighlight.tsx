'use client';

import type { SubjectImbalanceEntry } from '@/lib/study-stats';

interface SubjectImbalanceHighlightProps {
  data: SubjectImbalanceEntry[];
  loading?: boolean;
}

export default function SubjectImbalanceHighlight({
  data,
  loading = false,
}: SubjectImbalanceHighlightProps) {
  const underperforming = data.filter((entry) => entry.gapPoints < 0).slice(0, 3);

  if (loading || underperforming.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/40">
      <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
        실행 비중이 계획보다 낮은 과목
      </p>
      <ul className="mt-2 space-y-1">
        {underperforming.map((entry) => (
          <li
            key={entry.subject}
            className="flex items-center justify-between gap-3 text-sm text-amber-900 dark:text-amber-100"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="truncate">{entry.label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-xs">
              계획 {entry.plannedShare}% → 실행 {entry.executedShare}% ({entry.gapPoints}%p)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
