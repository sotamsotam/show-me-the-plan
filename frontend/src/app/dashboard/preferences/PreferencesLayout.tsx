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

interface PreferencesLayoutProps {
  children: ReactNode;
}

export default function PreferencesLayout({ children }: PreferencesLayoutProps) {
  const pathname = usePathname();

  return (
    <main className="flex w-full min-w-0 flex-col py-8 md:h-full md:min-h-0 md:overflow-hidden">
      <div className="flex w-full min-w-0 flex-col gap-6 md:min-h-0 md:flex-1 md:flex-row md:gap-8">
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
                } ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-950/40'
                    : 'hover:bg-gray-50 dark:hover:bg-zinc-800/60'
                }`}
              >
                <PreferencesNavIcon name={item.icon} />
                <span
                  className={`min-w-0 flex-1 text-[15px] leading-snug ${
                    isActive
                      ? 'font-semibold text-blue-700 dark:text-blue-300'
                      : 'font-medium text-gray-900 dark:text-gray-100'
                  }`}
                >
                  {item.label}
                </span>
                <ChevronRightIcon
                  className={`h-4 w-4 shrink-0 ${
                    isActive ? 'text-blue-500' : 'text-gray-400'
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        <nav
          aria-label="설정 메뉴"
          className="hidden shrink-0 gap-2 md:flex md:w-52 md:flex-col md:gap-1"
        >
          {PREFERENCES_NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`inline-flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium leading-snug transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-zinc-800 dark:hover:text-gray-100'
                }`}
              >
                <PreferencesNavIcon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="min-w-0 flex-1 md:flex md:min-h-0 md:flex-col md:overflow-y-auto">
          {children}
        </div>
      </div>
    </main>
  );
}
