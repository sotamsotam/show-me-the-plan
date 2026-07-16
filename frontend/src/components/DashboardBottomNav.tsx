'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import ResponsiveOverlay from '@/components/ResponsiveOverlay';
import {
  MoreNavIcon,
  ManagerGuideNavIcon,
  OverviewNavIcon,
  PerformanceNavIcon,
  ScheduleNavIcon,
  StudentsNavIcon,
  StudyPlanNavIcon,
  TodoNavIcon,
} from '@/components/DashboardNavIcons';
import SettingsIcon from '@/components/SettingsIcon';
import {
  isManagerMoreRoute,
  isMoreRoute,
  MANAGER_NAV_ITEMS,
  STUDENT_MORE_ITEMS,
  STUDENT_TAB_ITEMS,
} from '@/lib/dashboard-nav-config';
import SignOutButton from '@/app/dashboard/SignOutButton';
import { useUserSchedulesInRange } from '@/hooks/useUserSchedulesInRange';
import { countUpcomingPerformanceAssessments } from '@/lib/performance-assessment';
import { getTodayIsoDate, shiftIsoDate } from '@/lib/user-schedule';

const STUDENT_TAB_ICONS = [
  ScheduleNavIcon,
  PerformanceNavIcon,
  StudyPlanNavIcon,
  TodoNavIcon,
] as const;

const MANAGER_TAB_ICONS = [OverviewNavIcon, StudentsNavIcon, ManagerGuideNavIcon] as const;

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

function PerformanceTabIcon({
  active,
  count,
}: {
  active: boolean;
  count: number;
}) {
  const badgeLabel = count > 9 ? '9+' : String(count);

  return (
    <span className="relative inline-flex">
      <PerformanceNavIcon className={`h-5 w-5 shrink-0 ${active ? 'stroke-[2.5]' : ''}`} />
      {count > 0 ? (
        <span
          className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-0.5 text-[9px] font-bold leading-none text-white"
          aria-label={`수행평가 ${count}개`}
        >
          {badgeLabel}
        </span>
      ) : null}
    </span>
  );
}

export default function DashboardBottomNav({ variant }: DashboardBottomNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const today = getTodayIsoDate();
  const performanceRangeEnd = useMemo(() => shiftIsoDate(today, 60), [today]);
  const { schedules: performanceSchedules } = useUserSchedulesInRange({
    start: today,
    end: performanceRangeEnd,
    scheduleCategory: 'performance',
    enabled: variant === 'student',
  });
  const upcomingPerformanceCount = useMemo(
    () => countUpcomingPerformanceAssessments(performanceSchedules, today),
    [performanceSchedules, today]
  );

  function isActive(href: string, exact = false) {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  }

  if (variant === 'manager') {
    const moreActive = isManagerMoreRoute(pathname);

    return (
      <>
        <nav
          className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden dark:border-neutral-800 dark:bg-zinc-900/95"
          aria-label="하단 메뉴"
        >
          <div className="flex h-14 items-stretch">
            {MANAGER_NAV_ITEMS.map(({ href, label, shortLabel, exact }, index) => {
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
                  <span className="truncate">{shortLabel ?? label}</span>
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
              <MoreNavIcon
                className={`h-5 w-5 shrink-0 ${moreActive || moreOpen ? 'stroke-[2.5]' : ''}`}
              />
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
            <Link
              href="/dashboard/settings"
              onClick={() => setMoreOpen(false)}
              className={`flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-zinc-800 ${
                isActive('/dashboard/settings')
                  ? 'bg-blue-50 dark:bg-blue-950/40'
                  : ''
              }`}
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
            const isPerformanceTab = href === '/dashboard/performance';

            return (
              <Link
                key={href}
                href={href}
                className={tabButtonClass(active)}
                aria-current={active ? 'page' : undefined}
              >
                {isPerformanceTab ? (
                  <PerformanceTabIcon active={active} count={upcomingPerformanceCount} />
                ) : (
                  <Icon className={`h-5 w-5 shrink-0 ${active ? 'stroke-[2.5]' : ''}`} />
                )}
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
