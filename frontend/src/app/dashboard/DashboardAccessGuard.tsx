'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface DashboardAccessGuardProps {
  children: React.ReactNode;
  isPendingManager: boolean;
  defaultHomePath: string;
}

export default function DashboardAccessGuard({
  children,
  isPendingManager,
  defaultHomePath,
}: DashboardAccessGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isPendingPage = pathname === '/dashboard/pending';
  const isSettingsPage = pathname === '/dashboard/settings';
  const isAllowedPendingPath = isPendingPage || isSettingsPage;

  useEffect(() => {
    if (isPendingManager && !isAllowedPendingPath) {
      router.replace('/dashboard/pending');
      return;
    }

    if (!isPendingManager && isPendingPage) {
      router.replace(defaultHomePath);
    }
  }, [isPendingManager, isPendingPage, isAllowedPendingPath, defaultHomePath, router]);

  if (isPendingManager && !isAllowedPendingPath) {
    return null;
  }

  if (!isPendingManager && isPendingPage) {
    return null;
  }

  return <>{children}</>;
}
