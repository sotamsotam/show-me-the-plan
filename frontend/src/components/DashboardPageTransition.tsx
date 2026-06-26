'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

interface DashboardPageTransitionProps {
  children: ReactNode;
}

export default function DashboardPageTransition({
  children,
}: DashboardPageTransitionProps) {
  const pathname = usePathname();
  const isSidebarLayoutRoute =
    pathname.startsWith('/dashboard/preferences') ||
    pathname.startsWith('/dashboard/guide') ||
    pathname.startsWith('/dashboard/manager-guide');

  if (isSidebarLayoutRoute) {
    return (
      <div className="flex min-h-0 w-full flex-1 flex-col">{children}</div>
    );
  }

  return (
    <div key={pathname} className="animate-page-in flex min-h-0 w-full flex-1 flex-col">
      {children}
    </div>
  );
}
