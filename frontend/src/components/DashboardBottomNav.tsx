'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import ResponsiveOverlay from '@/components/ResponsiveOverlay';
import {
  ExecutionNavIcon,
  MoreNavIcon,
  OverviewNavIcon,
  ScheduleNavIcon,
  StudentsNavIcon,
  StudyPlanNavIcon,
  TodoNavIcon,
} from '@/components/DashboardNavIcons';
import SettingsIcon from '@/components/SettingsIcon';
import {
  isMoreRoute,
  MANAGER_NAV_ITEMS,
  STUDENT_MORE_ITEMS,
  STUDENT_TAB_ITEMS,
} from '@/lib/dashboard-nav-config';
import SignOutButton from '@/app/dashboard/SignOutButton';

const STUDENT_TAB_ICONS = [
  TodoNavIcon,
  ScheduleNavIcon,
  StudyPlanNavIcon,
  ExecutionNavIcon,
] as const;

const MANAGER_TAB_ICONS = [StudentsNavIcon, OverviewNavIcon] as const;

interface DashboardBottomNavProps {
  variant: 'student' | 'manager';
}

function tabButtonClass(active: boolean) {
  return `touch-press flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] font-medium transition-colors ${
    active
      ? 'text-blue-600 dark:text-blue-400'
      : 'text-gray-500 dark:text-gray-400'
  }`;
}

export default function DashboardBottomNav({ variant }: DashboardBottomNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  function isActive(href: string, exact = false) {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  }

  if (variant === 'manager') {
    return (
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden dark:border-neutral-800 dark:bg-zinc-900/95"
        aria-label="하단 메뉴"
      >
        <div className="flex h-14 items-stretch">
          {MANAGER_NAV_ITEMS.map(({ href, label, exact }, index) => {
            const active = isActive(href, exact);
            const Icon = MANAGER_TAB_ICONS[index];

            return (
              <Link
                key={href}
                href={href}
                className={tabButtonClass(active)}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className={`h-5 w-5 shrink-0 ${active ? 'stroke-[2.5]' : ''}`} />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  const moreActive = isMoreRoute(pathname);

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden dark:border-neutral-800 dark:bg-zinc-900/95"
        aria-label="하단 메뉴"
      >
        <div className="flex h-14 items-stretch">
          {STUDENT_TAB_ITEMS.map(({ href, shortLabel }, index) => {
            const active = isActive(href);
            const Icon = STUDENT_TAB_ICONS[index];

            return (
              <Link
                key={href}
                href={href}
                className={tabButtonClass(active)}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className={`h-5 w-5 shrink-0 ${active ? 'stroke-[2.5]' : ''}`} />
                <span className="truncate">{shortLabel}</span>
              </Link>
            );
          })}
          <button
            type="button"
            className={tabButtonClass(moreActive || moreOpen)}
            aria-expanded={moreOpen}
            aria-label="더보기 메뉴"
            onClick={() => setMoreOpen(true)}
          >
            <MoreNavIcon className={`h-5 w-5 shrink-0 ${moreActive || moreOpen ? 'stroke-[2.5]' : ''}`} />
            <span>더보기</span>
          </button>
        </div>
      </nav>

      <ResponsiveOverlay
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title="더보기"
        mobileVariant="sheet"
      >
        <nav className="flex flex-col gap-1 pb-2" aria-label="추가 메뉴">
          {STUDENT_MORE_ITEMS.map(({ href, label }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMoreOpen(false)}
                className={`mobile-list-row ${
                  active
                    ? 'bg-blue-50 dark:bg-blue-950/40'
                    : 'hover:bg-gray-50 dark:hover:bg-zinc-800'
                }`}
              >
                {label}
              </Link>
            );
          })}
          <Link
            href="/dashboard/settings"
            onClick={() => setMoreOpen(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-zinc-800"
          >
            <SettingsIcon className="h-4 w-4" />
            내정보 수정
          </Link>
          <SignOutButton variant="menu" />
        </nav>
      </ResponsiveOverlay>
    </>
  );
}
