import { formatRatePercent, getRateBarColor } from '@/lib/rate-bar';

interface PercentRateBarProps {
  rate: number | null;
  ariaLabelPrefix: string;
  className?: string;
}

export default function PercentRateBar({
  rate,
  ariaLabelPrefix,
  className,
}: PercentRateBarProps) {
  if (rate === null) {
    return (
      <span className="text-sm tabular-nums text-gray-400 dark:text-gray-500">-</span>
    );
  }

  const clampedRate = Math.min(Math.max(rate, 0), 100);
  const isFullBar = rate >= 100;
  const barWidth = isFullBar ? 100 : clampedRate;
  const label = formatRatePercent(rate);

  return (
    <div
      className={`relative h-7 w-full min-w-[72px] ${className ?? 'mx-auto max-w-[112px]'}`}
      role="meter"
      aria-valuenow={isFullBar ? 100 : clampedRate}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${ariaLabelPrefix} ${label}`}
    >
      <div className="absolute inset-0 overflow-hidden rounded-full bg-gray-200 dark:bg-zinc-700">
        <div
          className={`h-full rounded-full transition-[width] ${getRateBarColor(rate)} ${
            isFullBar ? 'w-full' : ''
          }`}
          style={isFullBar ? undefined : { width: `${barWidth}%` }}
        />
      </div>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold tabular-nums text-gray-900 drop-shadow-sm dark:text-gray-100">
        {label}
      </span>
    </div>
  );
}
