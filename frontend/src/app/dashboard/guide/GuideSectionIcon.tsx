import type { GuideSectionIconName } from '@/content/guide/types';

interface GuideSectionIconProps {
  name: GuideSectionIconName;
  className?: string;
}

export default function GuideSectionIcon({
  name,
  className = 'h-5 w-5 shrink-0',
}: GuideSectionIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {name === 'app-install' && (
        <>
          <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
          <path d="M12 18h.01" />
        </>
      )}
      {name === 'alarm' && (
        <>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </>
      )}
      {name === 'print' && (
        <>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6" />
          <rect width="12" height="8" x="6" y="14" rx="1" />
        </>
      )}
      {name === 'calendar-month' && (
        <>
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M3 10h18" />
          <path d="M8 14h.01" />
          <path d="M12 14h.01" />
          <path d="M16 14h.01" />
          <path d="M8 18h.01" />
          <path d="M12 18h.01" />
          <path d="M16 18h.01" />
        </>
      )}
      {name === 'calendar-week' && (
        <>
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M3 10h18" />
          <path d="M10 10v8" />
          <path d="M14 10v8" />
        </>
      )}
      {name === 'todo-list' && (
        <>
          <path d="M9 6h12" />
          <path d="M9 12h12" />
          <path d="M9 18h12" />
          <path d="M4 6h.01" />
          <path d="M4 12h.01" />
          <path d="M4 18h.01" />
        </>
      )}
      {name === 'timer' && (
        <>
          <line x1="10" x2="14" y1="2" y2="2" />
          <line x1="12" x2="15" y1="14" y2="11" />
          <circle cx="12" cy="14" r="8" />
        </>
      )}
      {name === 'timeline-progress' && (
        <>
          <path d="M3 3v18h18" />
          <path d="M7 16v-4" />
          <path d="M11 16V8" />
          <path d="M15 16v-6" />
          <path d="M19 16V5" />
        </>
      )}
      {name === 'todo-edit' && (
        <>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </>
      )}
      {name === 'period-range' && (
        <>
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M3 10h18" />
          <path d="M8 14h.01" />
          <path d="M12 14h.01" />
          <path d="M16 14h.01" />
        </>
      )}
      {name === 'execution-table' && (
        <>
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M3 9h18" />
          <path d="M3 15h18" />
          <path d="M9 3v18" />
        </>
      )}
      {name === 'execution-metrics' && (
        <>
          <path d="M3 3v18h18" />
          <path d="M7 12h2v5H7z" />
          <path d="M11 8h2v9h-2z" />
          <path d="M15 5h2v12h-2z" />
        </>
      )}
      {name === 'stats-cards' && (
        <>
          <rect width="7" height="7" x="3" y="3" rx="1" />
          <rect width="7" height="7" x="14" y="3" rx="1" />
          <rect width="7" height="7" x="3" y="14" rx="1" />
          <rect width="7" height="7" x="14" y="14" rx="1" />
        </>
      )}
      {name === 'stats-trend' && (
        <>
          <path d="M3 3v18h18" />
          <path d="M4 16 9 11 14 14 20 7" />
        </>
      )}
      {name === 'stats-insight' && (
        <>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
          <path d="M11 8v6" />
          <path d="M8 11h6" />
        </>
      )}
      {name === 'account-profile' && (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M6 20v-1a6 6 0 0 1 12 0v1" />
        </>
      )}
      {name === 'subjects-book' && (
        <>
          <path d="M12 7v14" />
          <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
        </>
      )}
      {name === 'password-lock' && (
        <>
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </>
      )}
      {name === 'manager-team' && (
        <>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </>
      )}
      {name === 'billing-card' && (
        <>
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <path d="M2 10h20" />
        </>
      )}
    </svg>
  );
}
