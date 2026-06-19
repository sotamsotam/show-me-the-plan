import { formatDurationMinutes } from '@/lib/day-timeline';
import { formatRatePercent, getRateBarColor } from '@/lib/rate-bar';

interface DayStudyTimeProgressProps {
  plannedMinutes: number;
  executedMinutes: number;
  achievementRate: number | null;
  className?: string;
}

function ProgressChart({
  plannedMinutes,
  executedMinutes,
  achievementRate,
}: {
  plannedMinutes: number;
  executedMinutes: number;
  achievementRate: number | null;
}) {
  const hasPlan = plannedMinutes > 0;
  const hasExecuted = executedMinutes > 0;

  if (!hasPlan && !hasExecuted) {
    return (
      <p className="text-xs text-gray-500 dark:text-gray-400">
        오늘 스터디 플랜 없음
      </p>
    );
  }

  const displayRate = achievementRate ?? (hasExecuted && !hasPlan ? null : 0);
  const barRate =
    displayRate === null ? (hasExecuted ? 100 : 0) : Math.max(0, displayRate);
  const clampedBarWidth = Math.min(barRate, 100);
  const isFullBar = barRate >= 100;
  const barColor = getRateBarColor(hasPlan ? (achievementRate ?? 0) : 100);

  return (
    <>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          시간 달성
        </span>
        <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
          {hasPlan ? formatRatePercent(achievementRate) : hasExecuted ? '—' : '0%'}
        </span>
      </div>

      <div
        className="relative h-3 w-full overflow-hidden rounded-full bg-gray-200/90 dark:bg-zinc-700"
        role="meter"
        aria-valuenow={hasPlan ? Math.min(achievementRate ?? 0, 100) : clampedBarWidth}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={
          hasPlan
            ? `시간 달성 ${formatRatePercent(achievementRate)}, 계획 ${formatDurationMinutes(plannedMinutes)}, 실제 ${formatDurationMinutes(executedMinutes)}`
            : `실제 ${formatDurationMinutes(executedMinutes)}`
        }
      >
        {hasPlan ? (
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-emerald-100/90 dark:bg-emerald-950/50"
            style={{ width: '100%' }}
            aria-hidden="true"
          />
        ) : null}
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ${barColor} ${
            isFullBar ? 'w-full' : ''
          }`}
          style={isFullBar ? undefined : { width: `${clampedBarWidth}%` }}
          aria-hidden="true"
        />
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-gray-500 dark:text-gray-400">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <span
            className="h-2 w-2 shrink-0 rounded-full border border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/60"
            aria-hidden="true"
          />
          <span className="truncate">
            계획{' '}
            <span className="font-semibold tabular-nums text-gray-700 dark:text-gray-200">
              {formatDurationMinutes(plannedMinutes)}
            </span>
          </span>
        </span>
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${barColor}`}
            aria-hidden="true"
          />
          <span className="truncate">
            실제{' '}
            <span className="font-semibold tabular-nums text-gray-700 dark:text-gray-200">
              {formatDurationMinutes(executedMinutes)}
            </span>
          </span>
        </span>
      </div>
    </>
  );
}

function TodayStudyTimeHighlight({ executedMinutes }: { executedMinutes: number }) {
  return (
    <div className="flex h-full min-w-[7.5rem] flex-col items-center justify-center text-center sm:min-w-[9rem]">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
        오늘 공부시간
      </p>
      <p
        className="mt-1 text-2xl font-bold leading-tight tracking-tight tabular-nums text-gray-900 dark:text-gray-100 sm:text-3xl"
        aria-label={`오늘 공부시간 ${formatDurationMinutes(executedMinutes)}`}
      >
        {formatDurationMinutes(executedMinutes)}
      </p>
    </div>
  );
}

export default function DayStudyTimeProgress({
  plannedMinutes,
  executedMinutes,
  achievementRate,
  className = '',
}: DayStudyTimeProgressProps) {
  return (
    <div className={`flex w-full items-stretch gap-4 sm:gap-5 ${className}`.trim()}>
      <div className="min-w-0 flex-1">
        <ProgressChart
          plannedMinutes={plannedMinutes}
          executedMinutes={executedMinutes}
          achievementRate={achievementRate}
        />
      </div>

      <div
        className="w-px shrink-0 self-stretch bg-gray-200 dark:bg-neutral-700"
        aria-hidden="true"
      />

      <TodayStudyTimeHighlight executedMinutes={executedMinutes} />
    </div>
  );
}
