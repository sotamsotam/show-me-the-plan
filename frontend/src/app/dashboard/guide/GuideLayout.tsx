'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { ChevronRightIcon } from '@/components/ChevronRightIcon';
import { GUIDE_NAV_ITEMS } from './guide-nav-config';
import GuideNavIcon from './GuideNavIcon';

const GUIDE_SIDEBAR_COLLAPSED_KEY = 'guide-sidebar-collapsed';

interface GuideLayoutProps {
  children: ReactNode;
}

type NavIconName = (typeof GUIDE_NAV_ITEMS)[number]['icon'];

function GuideNavItemIcon({
  active,
  name,
}: {
  active: boolean;
  name: NavIconName;
}) {
  return (
    <GuideNavIcon
      name={name}
      className={`h-4 w-4 shrink-0 ${
        active ? 'text-white' : 'text-gray-500 dark:text-gray-400'
      }`}
    />
  );
}

const guideNavActiveClass = 'bg-[#1b76e0] font-semibold text-white';
const guideNavInactiveClass =
  'font-medium text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-zinc-800/60 dark:hover:text-gray-100';

const sidebarToggleButtonClass =
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#1b76e0]/40 bg-white text-[#1b76e0] shadow-sm transition-colors hover:border-[#1b76e0]/65 hover:bg-[#edf4ff] hover:text-[#1557b0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b76e0] dark:border-[#3b8eea]/50 dark:bg-zinc-800 dark:text-[#7eb8ff] dark:hover:border-[#3b8eea]/75 dark:hover:bg-zinc-700';

function readSidebarCollapsed(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return localStorage.getItem(GUIDE_SIDEBAR_COLLAPSED_KEY) === 'true';
}

export default function GuideLayout({ children }: GuideLayoutProps) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    setSidebarCollapsed(readSidebarCollapsed());
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed;
      localStorage.setItem(GUIDE_SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  };

  return (
    <main
      data-guide-layout
      className="flex w-full min-w-0 flex-col py-8 md:min-h-0 md:flex-1 md:overflow-hidden md:py-0"
    >
      <div className="flex w-full min-w-0 flex-col gap-6 md:min-h-0 md:flex-1 md:flex-row md:gap-0 md:min-h-[calc(100dvh-4.5rem-env(safe-area-inset-top,0px))]">
        <nav
          aria-label="사용법 메뉴"
          className="overflow-hidden rounded-xl border border-gray-200 bg-white md:hidden dark:border-neutral-800 dark:bg-zinc-900"
        >
          {GUIDE_NAV_ITEMS.map((item, index) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`mobile-list-row ${
                  index > 0 ? 'border-t border-gray-200 dark:border-neutral-800' : ''
                } ${isActive ? guideNavActiveClass : 'hover:bg-gray-50 dark:hover:bg-zinc-800/60'}`}
              >
                <GuideNavItemIcon active={isActive} name={item.icon} />
                <span
                  className={`min-w-0 flex-1 text-[15px] leading-snug ${
                    isActive ? 'font-semibold text-white' : 'font-medium text-gray-900 dark:text-gray-100'
                  }`}
                >
                  {item.label}
                </span>
                <ChevronRightIcon
                  className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`}
                />
              </Link>
            );
          })}
        </nav>

        {sidebarCollapsed ? (
          <aside className="hidden shrink-0 self-stretch md:flex md:flex-col md:border-r md:border-gray-200 md:bg-[#f1f1f1] md:py-6 md:pl-[50px] md:pr-3 dark:border-neutral-800 dark:bg-zinc-900">
            <button
              type="button"
              className={sidebarToggleButtonClass}
              aria-label="사용법 메뉴 펼치기"
              aria-expanded={false}
              onClick={toggleSidebar}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </aside>
        ) : (
          <aside className="hidden shrink-0 self-stretch md:flex md:flex-col md:border-r md:border-gray-200 md:bg-[#f1f1f1] md:py-6 md:pl-[50px] md:pr-4 dark:border-neutral-800 dark:bg-zinc-900">
            <div className="mb-2 flex w-60 justify-end">
              <button
                type="button"
                className={sidebarToggleButtonClass}
                aria-label="사용법 메뉴 접기"
                aria-expanded
                onClick={toggleSidebar}
              >
                <ChevronRightIcon className="h-4 w-4 rotate-180" />
              </button>
            </div>
            <nav aria-label="사용법 메뉴" className="flex w-60 flex-col gap-0.5">
              {GUIDE_NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm leading-[1.35] transition-colors duration-150 ${
                      isActive ? guideNavActiveClass : guideNavInactiveClass
                    }`}
                  >
                    <GuideNavItemIcon active={isActive} name={item.icon} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>
        )}

        <div className="min-w-0 flex-1 md:flex md:min-h-0 md:flex-col md:overflow-y-auto md:py-6 md:pl-8 md:pr-[50px]">
          {children}
        </div>
      </div>
    </main>
  );
}
