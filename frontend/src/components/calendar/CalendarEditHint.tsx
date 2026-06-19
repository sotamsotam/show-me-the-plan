'use client';

import type { CalendarEditHintModel } from '@/lib/calendar-edit-hint';

interface CalendarEditHintProps {
  hint: CalendarEditHintModel | null;
}

function HintIcon({ variant }: { variant: CalendarEditHintModel['variant'] }) {
  if (variant === 'draft') {
    return (
      <svg
        className="h-5 w-5 shrink-0"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  return (
    <svg
      className="h-5 w-5 shrink-0"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function CalendarEditHint({ hint }: CalendarEditHintProps) {
  if (!hint) {
    return null;
  }

  const toneClass =
    hint.variant === 'draft'
      ? 'calendar-edit-hint--draft'
      : 'calendar-edit-hint--select';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`calendar-edit-hint ${toneClass} mb-3 flex items-start gap-3 rounded-lg border px-4 py-3`}
    >
      <HintIcon variant={hint.variant} />
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-snug">{hint.title}</p>
        <p className="mt-0.5 text-sm leading-snug opacity-90">{hint.description}</p>
      </div>
    </div>
  );
}
