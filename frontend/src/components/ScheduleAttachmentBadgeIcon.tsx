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

function CameraAttachmentGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden {...props}>
      <path
        d="M4.5 8.5A2.5 2.5 0 0 1 7 6h1.4l1.2-1.8A1.5 1.5 0 0 1 10.85 3.5h2.3a1.5 1.5 0 0 1 1.25.7L15.6 6H17a2.5 2.5 0 0 1 2.5 2.5v9A2.5 2.5 0 0 1 17 20H7a2.5 2.5 0 0 1-2.5-2.5v-9Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.25" />
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

export function ScheduleAttachmentCameraIcon({
  className = 'h-7 w-7',
}: {
  className?: string;
}) {
  return <CameraAttachmentGlyph className={className} aria-hidden />;
}
