export const MANAGER_GUIDE_NAV_ITEMS = [
  {
    href: '/dashboard/manager-guide/students',
    label: '학생별 관리',
    icon: 'students',
  },
  {
    href: '/dashboard/manager-guide/overview',
    label: '학생별 공부현황',
    icon: 'overview',
  },
] as const;

export const MANAGER_GUIDE_DEFAULT_HREF = MANAGER_GUIDE_NAV_ITEMS[0].href;
