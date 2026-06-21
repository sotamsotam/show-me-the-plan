interface StudentSubscriptionBadgeProps {
  isAccessAllowed?: boolean;
  compact?: boolean;
}

export default function StudentSubscriptionBadge({
  isAccessAllowed,
  compact = false,
}: StudentSubscriptionBadgeProps) {
  if (typeof isAccessAllowed !== 'boolean') {
    return null;
  }

  if (isAccessAllowed) {
    return (
      <span
        className={`inline-flex items-center rounded-full bg-emerald-100 font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 ${
          compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs'
        }`}
      >
        유효
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full bg-red-100 font-medium text-red-800 dark:bg-red-950 dark:text-red-200 ${
        compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs'
      }`}
    >
      만료 — 관리 불가
    </span>
  );
}
