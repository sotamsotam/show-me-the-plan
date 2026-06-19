'use client';

import {
  formatPrepDayLabel,
  formatPrepWeekLabel,
  type ExamCountdownResult,
} from '@/lib/exam-countdown';

interface ExamCountdownBadgeProps {
  countdown: ExamCountdownResult;
  variant?: 'week' | 'day';
}

export default function ExamCountdownBadge({
  countdown,
  variant = 'week',
}: ExamCountdownBadgeProps) {
  const primaryLabel =
    variant === 'day'
      ? formatPrepDayLabel(countdown.daysRemaining)
      : formatPrepWeekLabel(countdown.prepWeekNumber);

  return (
    <span className="exam-countdown-badge">
      <span className="exam-countdown-badge__days">{primaryLabel}</span>
      <span className="exam-countdown-badge__label">{countdown.label}</span>
    </span>
  );
}
