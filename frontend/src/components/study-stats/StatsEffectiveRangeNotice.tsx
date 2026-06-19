'use client';

import type { EffectiveStatsRange } from '@/lib/study-stats';

interface StatsEffectiveRangeNoticeProps {
  range: EffectiveStatsRange;
}

function formatNoticeDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  return `${parsed.getFullYear()}.${String(parsed.getMonth() + 1).padStart(2, '0')}.${String(parsed.getDate()).padStart(2, '0')}`;
}

export default function StatsEffectiveRangeNotice({
  range,
}: StatsEffectiveRangeNoticeProps) {
  if (range.isNotStartedYet) {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
        선택한 구간은 아직 시작되지 않았습니다. 시작일 이후에 성과 통계가 집계됩니다.
      </div>
    );
  }

  if (!range.hasFuturePortion) {
    return null;
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
      성과 통계는{' '}
      <span className="font-semibold">{formatNoticeDate(range.performanceEnd)}</span>
      까지 집계합니다. 이후 미래 일정은 달성률·미달성 집계에서 제외되며, 아래
      &quot;남은 계획&quot;에서 확인할 수 있습니다.
    </div>
  );
}
