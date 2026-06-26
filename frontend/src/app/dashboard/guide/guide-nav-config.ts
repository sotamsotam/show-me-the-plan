export const GUIDE_NAV_ITEMS = [
  {
    href: '/dashboard/guide/getting-started',
    label: '처음시작하기',
    icon: 'getting-started',
  },
  {
    href: '/dashboard/guide/exam-period-planning',
    label: '시험기간 계획하기',
    icon: 'exam-period-planning',
  },
  {
    href: '/dashboard/guide/vacation-period-planning',
    label: '방학기간 계획하기',
    icon: 'vacation-period-planning',
  },
  {
    href: '/dashboard/guide/tips',
    label: '편리한 사용법',
    icon: 'tips',
  },
  {
    href: '/dashboard/guide/schedule',
    label: '일상 스케줄',
    icon: 'schedule',
  },
  {
    href: '/dashboard/guide/study-plan',
    label: '공부 스케줄',
    icon: 'study-plan',
  },
  {
    href: '/dashboard/guide/todo',
    label: 'TODO',
    icon: 'todo',
  },
  {
    href: '/dashboard/guide/study-execution',
    label: '공부현황',
    icon: 'study-execution',
  },
  {
    href: '/dashboard/guide/study-stats',
    label: '공부통계',
    icon: 'study-stats',
  },
  {
    href: '/dashboard/guide/account-settings',
    label: '내정보관리',
    icon: 'account-settings',
  },
] as const;

export const GUIDE_DEFAULT_HREF = GUIDE_NAV_ITEMS[0].href;
