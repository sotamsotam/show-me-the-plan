import type { SVGProps } from 'react';

type ScheduleAttachmentBadgeIconProps = {
  count?: number;
  className?: string;
  compact?: boolean;
};

function ImageAttachmentGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden {...props}>
      <path d="M4 3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H4Zm10 2a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM4 14.25l3.75-4.5 2.75 3.3 2.25-2.7L16 14.25H4Z" />
    </svg>
  );
}

export default function ScheduleAttachmentBadgeIcon({
  count = 1,
  className = '',
  compact = false,
}: ScheduleAttachmentBadgeIconProps) {
  const showCount = count > 1;

  return (
    <span
      className={[
        'schedule-attachment-badge',
        compact ? 'schedule-attachment-badge--compact' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden={showCount ? undefined : true}
    >
      <ImageAttachmentGlyph className="schedule-attachment-badge__icon" />
      {showCount ? (
        <span className="schedule-attachment-badge__count">{count}</span>
      ) : null}
    </span>
  );
}

export function ScheduleAttachmentPickerIcon({
  className = 'h-7 w-7',
}: {
  className?: string;
}) {
  return <ImageAttachmentGlyph className={className} aria-hidden />;
}
