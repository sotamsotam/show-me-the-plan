'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import DashboardBottomNav from '@/components/DashboardBottomNav';
import SettingsIcon from '@/components/SettingsIcon';
import {
  getDashboardPageTitle,
  MANAGER_NAV_ITEMS,
  STUDENT_DESKTOP_NAV_ITEMS,
} from '@/lib/dashboard-nav-config';
import type { AccountInfo } from '@/types/school';
import { isApprovedManager, isPendingManager, isNeisStudent, isOtherStudent, isAnyStudent, SCHOOL_LEVEL_LABEL } from '@/types/school';
import SignOutButton from './SignOutButton';

interface DashboardNavProps {
  account: AccountInfo | null;
  isPendingManager: boolean;
  isApprovedManager: boolean;
}

function formatUserLabel(
  account: AccountInfo | null,
  username: string | undefined
): string | null {
  const profile = account?.profile;

  if (profile?.schoolLevel === 'manager') {
    if (profile.managerStatus === 'pending') {
      return username ? `매니저 (승인 대기) ${username}` : '매니저 (승인 대기)';
    }

    if (account?.role?.type === 'manager' || profile.managerStatus === 'approved') {
      return username ? `매니저 ${username}` : '매니저';
    }
  }

  if (profile && isOtherStudent(profile.schoolLevel)) {
    return username ? `${SCHOOL_LEVEL_LABEL.other} ${username}` : SCHOOL_LEVEL_LABEL.other;
  }

  if (profile && isNeisStudent(profile.schoolLevel) && profile.schoolName) {
    const schoolLabel = `${profile.schoolName} ${profile.grade}학년 ${profile.className}반`;

    if (username) {
      return `${schoolLabel} ${username}`;
    }

    return schoolLabel;
  }

  return username ?? null;
}

function navLinkClass(active: boolean, compact = false) {
  const padding = compact ? 'px-3 py-1.5' : 'px-3 py-2';
  return `${padding} rounded-lg text-sm font-medium transition-colors ${
    active
      ? 'bg-[#1b76e0] text-white'
      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-zinc-800 dark:hover:text-gray-100'
  }`;
}

export default function DashboardNav({
  account: initialAccount,
  isPendingManager: isPendingManagerProp,
  isApprovedManager: isApprovedManagerProp,
}: DashboardNavProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [account, setAccount] = useState<AccountInfo | null>(initialAccount);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    setAccount(initialAccount);
  }, [initialAccount]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const res = await fetch('/api/profile/me', { credentials: 'include' });
        const data = await res.json();

        if (!cancelled && res.ok) {
          setAccount({
            user: data.user ?? null,
            role: data.role ?? null,
            profile: data.profile ?? null,
          });
        }
      } catch {
        if (!cancelled) {
          setAccount(initialAccount);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [initialAccount]);

  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > 0);
    }

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  function isActive(href: string, exact: boolean) {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  }

  const activeAccount = account ?? initialAccount;
  const pendingManager = activeAccount
    ? isPendingManager(activeAccount)
    : isPendingManagerProp;
  const approvedManager = activeAccount
    ? isApprovedManager(activeAccount)
    : isApprovedManagerProp;

  const desktopNavItems = pendingManager
    ? [{ href: '/dashboard/pending', label: '승인 대기', exact: true }]
    : approvedManager
      ? MANAGER_NAV_ITEMS
      : STUDENT_DESKTOP_NAV_ITEMS;

  const homeHref = pendingManager
    ? '/dashboard/pending'
    : approvedManager
      ? '/dashboard/students'
      : '/dashboard/todo';

  const userLabel = formatUserLabel(account, session?.user.username);
  const pageTitle = getDashboardPageTitle(pathname);
  const showMobileBottomNav = !pendingManager;
  const showBillingBadge =
    !pendingManager &&
    !approvedManager &&
    Boolean(activeAccount?.profile && isAnyStudent(activeAccount.profile.schoolLevel));

  const billingBadgeClassName =
    'inline-flex shrink-0 items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800 shadow-sm transition hover:border-blue-300 hover:bg-blue-100 active:scale-[0.98] dark:border-blue-700 dark:bg-blue-950/90 dark:text-blue-100 dark:hover:border-blue-600 dark:hover:bg-blue-900';

  const renderBillingBadge = (className = '') =>
    showBillingBadge ? (
      <Link
        href="/dashboard/settings/billing"
        className={`${billingBadgeClassName}${className ? ` ${className}` : ''}`}
      >
        구독관리
      </Link>
    ) : null;

  const renderDesktopNav = (className: string, compact = false) => (
    <nav className={className} aria-label="주 메뉴">
      {desktopNavItems.map(({ href, label, exact }) => {
        const active = isActive(href, exact);
        return (
          <Link key={href} href={href} className={navLinkClass(active, compact)}>
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <header
        className={`sticky top-0 z-30 border-b border-gray-200 bg-white pt-[env(safe-area-inset-top)] transition-shadow duration-200 dark:border-neutral-800 dark:bg-zinc-900 ${
          isScrolled ? 'shadow-md dark:shadow-black/40' : 'shadow-none'
        }`}
      >
        <div className="flex w-full flex-col">
          <div className="flex w-full items-center justify-between gap-4 px-4 pt-3 pb-4 min-[900px]:gap-6 md:px-[50px] md:pt-3 md:pb-4">
            <div className="flex min-w-0 flex-1 items-center gap-4 md:gap-6">
              <Link href={homeHref} className="hidden shrink-0 md:inline-block">
                <img
                  src="/logo/logo_wide_pc.png"
                  alt="Show Me The Plan"
                  className="h-9 w-auto object-contain sm:h-10"
                />
              </Link>
              <div className="flex min-w-0 items-center gap-2 overflow-hidden md:hidden">
                <img
                  src="/logo/logo_wide_pc.png"
                  alt="Show Me The Plan"
                  className="h-9 w-auto shrink-0 object-contain sm:h-10"
                />
                <span
                  className="shrink-0 text-xs text-gray-300 dark:text-gray-600"
                  aria-hidden
                >
                  ·
                </span>
                <h1 className="truncate text-[11px] font-medium text-gray-500 dark:text-gray-500">
                  {pageTitle}
                </h1>
              </div>
              {renderDesktopNav('hidden min-[900px]:flex items-center gap-1')}
            </div>
            <div className="flex shrink-0 items-center gap-2 md:gap-4">
              {userLabel && (
                <p className="hidden max-w-[240px] truncate text-sm text-gray-600 lg:block dark:text-gray-300">
                  {userLabel}
                </p>
              )}
              <Link
                href="/dashboard/settings"
                className="touch-press inline-flex h-11 w-11 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 md:hidden dark:text-gray-400 dark:hover:bg-zinc-800 dark:hover:text-gray-100"
                aria-label="내정보 수정"
                title="내정보 수정"
              >
                <SettingsIcon />
              </Link>
              <div className="hidden items-center gap-2 md:flex">
                {renderBillingBadge()}
                <Link
                  href="/dashboard/settings"
                  className="inline-flex items-center justify-center rounded-lg p-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-zinc-800 dark:hover:text-gray-100"
                  aria-label="내정보 수정"
                  title="내정보 수정"
                >
                  <SettingsIcon />
                </Link>
                <SignOutButton />
              </div>
            </div>
          </div>
          <div className="hidden border-t border-gray-200 bg-gray-50 px-4 md:flex md:px-[50px] min-[900px]:hidden dark:border-neutral-800 dark:bg-zinc-800/70">
            {renderDesktopNav('flex w-full flex-wrap items-center gap-1', true)}
          </div>
        </div>
      </header>

      {showMobileBottomNav && (
        <DashboardBottomNav variant={approvedManager ? 'manager' : 'student'} />
      )}
    </>
  );
}
