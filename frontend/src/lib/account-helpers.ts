import type { AccountInfo } from '@/types/school';
import {
  isApprovedManager,
  isPendingManager,
  isAnyStudent,
} from '@/types/school';

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
    return '/dashboard/students';
  }
  if (isAnyStudent(account?.profile?.schoolLevel)) {
    return '/dashboard/todo';
  }
  return '/dashboard';
}
