'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { ChevronRightIcon } from '@/components/ChevronRightIcon';
import PreferencesNavIcon from './PreferencesNavIcon';

const PREFERENCES_NAV_ITEMS = [
  {
    href: '/dashboard/preferences/exam-prep',
    label: '시험기간 설정',
    icon: 'exam-prep',
  },
  {
    href: '/dashboard/preferences/exam-prep-weekly-plan',
    label: '시험기간 주차별 공부계획',
    icon: 'exam-prep-weekly',
  },
  {
    href: '/dashboard/preferences/vacation-period',
    label: '방학기간 설정',
    icon: 'vacation-period',
  },
  {
    href: '/dashboard/preferences/vacation-weekly-plan',
    label: '방학기간 주차별 공부계획',
    icon: 'vacation-weekly',
  },
  {
    href: '/dashboard/preferences/regular-weekly-plan',
    label: '평소기간 주차별 공부계획',
    icon: 'regular-weekly',
  },
  {
    href: '/dashboard/preferences/subject-tags',
    label: '과목별 태그 설정',
    icon: 'subject-tags',
  },
] as const;

type NavIconName = (typeof PREFERENCES_NAV_ITEMS)[number]['icon'];

interface PreferencesLayoutProps {
  children: ReactNode;
}

function PreferencesNavItemIcon({
  active,
  name,
}: {
  active: boolean;
  name: NavIconName;
}) {
  return (
    <PreferencesNavIcon
      name={name}
      className={`h-4 w-4 shrink-0 ${
        active ? 'text-white' : 'text-gray-500 dark:text-gray-400'
      }`}
    />
  );
}

const preferencesNavActiveClass =
  'bg-[#1b76e0] font-semibold text-white';
const preferencesNavInactiveClass =
  'font-medium text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-zinc-800/60 dark:hover:text-gray-100';

export default function PreferencesLayout({ children }: PreferencesLayoutProps) {
  const pathname = usePathname();

  return (
    <main
      data-preferences-layout
      className="flex w-full min-w-0 flex-col py-8 md:min-h-0 md:flex-1 md:overflow-hidden md:py-0"
    >
      <div className="flex w-full min-w-0 flex-col gap-6 md:min-h-0 md:flex-1 md:flex-row md:gap-0 md:min-h-[calc(100dvh-4.5rem-env(safe-area-inset-top,0px))]">
        <nav
          aria-label="설정 메뉴"
          className="overflow-hidden rounded-xl border border-gray-200 bg-white md:hidden dark:border-neutral-800 dark:bg-zinc-900"
        >
          {PREFERENCES_NAV_ITEMS.map((item, index) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`mobile-list-row ${
                  index > 0 ? 'border-t border-gray-200 dark:border-neutral-800' : ''
                } ${isActive ? preferencesNavActiveClass : 'hover:bg-gray-50 dark:hover:bg-zinc-800/60'}`}
              >
                <PreferencesNavItemIcon active={isActive} name={item.icon} />
                <span
                  className={`min-w-0 flex-1 text-[15px] leading-snug ${
                    isActive ? 'font-semibold text-white' : 'font-medium text-gray-900 dark:text-gray-100'
                  }`}
                >
                  {item.label}
                </span>
                <ChevronRightIcon
                  className={`h-4 w-4 shrink-0 ${
                    isActive ? 'text-white' : 'text-gray-400'
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        <aside className="hidden shrink-0 self-stretch md:flex md:flex-col md:border-r md:border-gray-200 md:bg-[#f1f1f1] md:py-6 md:pl-[50px] md:pr-4 dark:border-neutral-800 dark:bg-zinc-900">
          <nav
            aria-label="설정 메뉴"
            className="flex w-60 flex-col gap-0.5"
          >
            {PREFERENCES_NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm leading-[1.35] transition-colors duration-150 ${
                    isActive ? preferencesNavActiveClass : preferencesNavInactiveClass
                  }`}
                >
                  <PreferencesNavItemIcon active={isActive} name={item.icon} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 md:flex md:min-h-0 md:flex-col md:overflow-y-auto md:py-6 md:pl-8 md:pr-[50px]">
          {children}
        </div>
      </div>
    </main>
  );
}
