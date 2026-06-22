import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export type MarketingIconName =
  | 'calendar'
  | 'checklist'
  | 'timetable'
  | 'timeline'
  | 'chart'
  | 'users'
  | 'data'
  | 'target'
  | 'routine'
  | 'parent'
  | 'student'
  | 'elementary'
  | 'middle'
  | 'high';

export function MarketingIcon({
  name,
  className = 'h-5 w-5',
}: {
  name: MarketingIconName;
  className?: string;
}) {
  switch (name) {
    case 'calendar':
      return (
        <IconBase className={className}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </IconBase>
      );
    case 'checklist':
      return (
        <IconBase className={className}>
          <path d="M9 11l2 2 4-4" />
          <path d="M21 12v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9" />
        </IconBase>
      );
    case 'timetable':
      return (
        <IconBase className={className}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 3v18" />
        </IconBase>
      );
    case 'timeline':
      return (
        <IconBase className={className}>
          <path d="M12 20V4" />
          <path d="M6 8h12M6 16h8" />
          <circle cx="12" cy="8" r="2" fill="currentColor" stroke="none" />
          <circle cx="12" cy="16" r="2" fill="currentColor" stroke="none" />
        </IconBase>
      );
    case 'chart':
      return (
        <IconBase className={className}>
          <path d="M4 19V5" />
          <path d="M4 19h16" />
          <path d="M8 17V11M12 17V7M16 17v-4" />
        </IconBase>
      );
    case 'users':
      return (
        <IconBase className={className}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </IconBase>
      );
    case 'data':
      return (
        <IconBase className={className}>
          <ellipse cx="12" cy="5" rx="7" ry="3" />
          <path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5" />
          <path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
        </IconBase>
      );
    case 'target':
      return (
        <IconBase className={className}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
        </IconBase>
      );
    case 'routine':
      return (
        <IconBase className={className}>
          <path d="M12 6v6l4 2" />
          <circle cx="12" cy="12" r="9" />
        </IconBase>
      );
    case 'parent':
      return (
        <IconBase className={className}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
          <circle cx="10" cy="8" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </IconBase>
      );
    case 'student':
      return (
        <IconBase className={className}>
          <path d="M22 10 12 5 2 10l10 5 10-5z" />
          <path d="M6 12v5c0 1.1 2.7 3 6 3s6-1.9 6-3v-5" />
        </IconBase>
      );
    case 'elementary':
      return (
        <IconBase className={className}>
          <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
          <path d="M12 12v9" />
        </IconBase>
      );
    case 'middle':
      return (
        <IconBase className={className}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </IconBase>
      );
    case 'high':
      return (
        <IconBase className={className}>
          <path d="M3 3v18h18" />
          <path d="M7 16l4-5 4 3 5-7" />
        </IconBase>
      );
    default:
      return null;
  }
}

export const FEATURE_ICONS: MarketingIconName[] = [
  'calendar',
  'checklist',
  'timetable',
  'timeline',
  'chart',
  'users',
];

export const VALUE_ICONS: MarketingIconName[] = ['data', 'target', 'routine'];

export const TARGET_ICONS: MarketingIconName[] = ['parent', 'student'];

export const PROCESS_STEP_ICONS: MarketingIconName[] = [
  'users',
  'timetable',
  'calendar',
  'checklist',
];

export const GRADE_ICONS: MarketingIconName[] = ['elementary', 'middle', 'high'];
