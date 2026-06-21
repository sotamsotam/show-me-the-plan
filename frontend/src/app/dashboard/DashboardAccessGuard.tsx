'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import SubscriptionStatusBanner from '@/components/SubscriptionStatusBanner';
import type { SubscriptionSummary } from '@/types/subscription';

interface DashboardAccessGuardProps {
  children: React.ReactNode;
  isPendingManager: boolean;
  isStudent: boolean;
  subscription: SubscriptionSummary | null | undefined;
  defaultHomePath: string;
}

export default function DashboardAccessGuard({
  children,
  isPendingManager,
  isStudent,
  subscription,
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

  return (
    <>
      {isStudent ? <SubscriptionStatusBanner subscription={subscription} /> : null}
      {children}
    </>
  );
}
