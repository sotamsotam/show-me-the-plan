export const STUDENT_DESKTOP_NAV_ITEMS = [
  { href: '/dashboard/todo', label: 'TODO', exact: false },
  { href: '/dashboard/schedule', label: '일상 스케줄', exact: false },
  { href: '/dashboard/study-plan', label: '공부계획 스케줄', exact: false },
  { href: '/dashboard/study-execution-detail', label: '공부현황', exact: false },
  { href: '/dashboard/study-stats', label: '공부통계', exact: false },
  { href: '/dashboard/preferences', label: '설정', exact: false },
] as const;

export const STUDENT_TAB_ITEMS = [
  { href: '/dashboard/todo', label: 'TODO', shortLabel: 'TODO' },
  { href: '/dashboard/schedule', label: '일상 스케줄', shortLabel: '일상' },
  { href: '/dashboard/study-plan', label: '공부계획 스케줄', shortLabel: '공부계획' },
  { href: '/dashboard/study-execution-detail', label: '공부현황', shortLabel: '현황' },
] as const;

export const STUDENT_MORE_ITEMS = [
  { href: '/dashboard/study-stats', label: '공부통계' },
  { href: '/dashboard/preferences', label: '설정' },
] as const;

export const MANAGER_NAV_ITEMS = [
  { href: '/dashboard/students', label: '학생별 관리', exact: true },
  { href: '/dashboard', label: '학생별 공부현황', exact: true },
] as const;

export const MORE_ROUTE_PREFIXES = [
  '/dashboard/study-stats',
  '/dashboard/preferences',
  '/dashboard/settings',
] as const;

const PAGE_TITLE_ENTRIES: Array<{ prefix: string; title: string; exact?: boolean }> = [
  { prefix: '/dashboard/todo', title: 'TODO' },
  { prefix: '/dashboard/schedule', title: '일상 스케줄' },
  { prefix: '/dashboard/study-plan', title: '공부계획 스케줄' },
  { prefix: '/dashboard/study-execution-detail', title: '공부현황' },
  { prefix: '/dashboard/study-stats', title: '공부통계' },
  { prefix: '/dashboard/preferences', title: '설정' },
  { prefix: '/dashboard/settings', title: '내정보' },
  { prefix: '/dashboard/students', title: '학생별 관리' },
  { prefix: '/dashboard/pending', title: '승인 대기', exact: true },
  { prefix: '/dashboard', title: '학생별 공부현황', exact: true },
];

export function getDashboardPageTitle(pathname: string): string {
  for (const { prefix, title, exact } of PAGE_TITLE_ENTRIES) {
    if (exact ? pathname === prefix : pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return title;
    }
  }

  return 'Show Me The Plan';
}

export function isMoreRoute(pathname: string): boolean {
  return MORE_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
