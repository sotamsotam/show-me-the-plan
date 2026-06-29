import type { AccountInfo, ManagerStatus, SchoolLevel } from '@/types/school';
import {
  isApprovedManager,
  isPendingManager,
  isAnyStudent,
} from '@/types/school';

export const MARKETING_HOME_BYPASS_QUERY = 'view';
export const MARKETING_HOME_BYPASS_VALUE = 'marketing';
export const APP_ENTRY_PATH = '/app';

export type SessionUserForRouting = {
  isOperator?: boolean;
  roleType?: string;
  managerStatus?: ManagerStatus | null;
  schoolLevel?: string | null;
};

export function isMarketingHomeBypass(
  searchParams: { view?: string | string[] } | null | undefined
): boolean {
  const view = searchParams?.view;
  if (Array.isArray(view)) {
    return view.includes(MARKETING_HOME_BYPASS_VALUE);
  }
  return view === MARKETING_HOME_BYPASS_VALUE;
}

export function getMarketingHomeUrl(): string {
  return `/?${MARKETING_HOME_BYPASS_QUERY}=${MARKETING_HOME_BYPASS_VALUE}`;
}

export function isSafeInternalCallbackPath(
  path: string | null | undefined
): path is string {
  if (!path) {
    return false;
  }

  if (!path.startsWith('/') || path.startsWith('//')) {
    return false;
  }

  if (path.includes('://')) {
    return false;
  }

  if (path === '/login' || path.startsWith('/login?') || path.startsWith('/login/')) {
    return false;
  }

  return true;
}

export function resolvePostLoginPath(
  user: SessionUserForRouting | null | undefined,
  callbackUrl?: string | null
): string {
  if (isSafeInternalCallbackPath(callbackUrl)) {
    return callbackUrl;
  }

  return getDefaultDashboardPathFromSession(user);
}

function sessionUserToAccountInfo(user: SessionUserForRouting): AccountInfo {
  return {
    role: user.roleType ? { id: 0, name: '', type: user.roleType } : null,
    profile: user.schoolLevel
      ? {
          schoolLevel: user.schoolLevel as SchoolLevel,
          managerStatus: user.managerStatus ?? null,
        }
      : null,
  };
}

export function accountToSessionUserForRouting(
  account: AccountInfo | null | undefined
): SessionUserForRouting | null {
  if (!account) {
    return null;
  }

  return {
    isOperator: account.profile?.isOperator === true,
    roleType: account.role?.type,
    managerStatus: account.profile?.managerStatus ?? null,
    schoolLevel: account.profile?.schoolLevel ?? null,
  };
}

export function getDefaultDashboardPathFromAccount(
  account: AccountInfo | null | undefined
): string {
  return getDefaultDashboardPathFromSession(accountToSessionUserForRouting(account));
}

export function getAccountFlags(account: AccountInfo | null) {
  return {
    isPendingManager: isPendingManager(account),
    isApprovedManager: isApprovedManager(account),
    isManagerAccount: account?.profile?.schoolLevel === 'manager',
  };
}

export function getDefaultDashboardPath(
  account: AccountInfo | null | undefined
): string {
  if (isPendingManager(account)) {
    return '/dashboard/pending';
  }
  if (isApprovedManager(account)) {
    return '/dashboard';
  }
  if (isAnyStudent(account?.profile?.schoolLevel)) {
    return '/dashboard/todo';
  }
  return '/dashboard';
}

export function getDefaultDashboardPathFromSession(
  user: SessionUserForRouting | null | undefined
): string {
  if (!user) {
    return '/dashboard';
  }

  if (user.isOperator) {
    return '/ops';
  }

  return getDefaultDashboardPath(sessionUserToAccountInfo(user));
}

export function getMarketingAppEntryFromSession(
  user: SessionUserForRouting
): { label: string; href: string } {
  if (user.isOperator) {
    return { label: '운영 콘솔', href: '/ops' };
  }

  const account = sessionUserToAccountInfo(user);

  if (isPendingManager(account)) {
    return { label: '승인 대기 안내', href: '/dashboard/pending' };
  }

  if (isApprovedManager(account)) {
    return { label: '학생별 공부현황', href: '/dashboard' };
  }

  if (isAnyStudent(user.schoolLevel)) {
    return { label: '오늘의 스터디플랜', href: '/dashboard/todo' };
  }

  return { label: '대시보드', href: '/dashboard' };
}
