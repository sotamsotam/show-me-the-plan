'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/ops', label: '대시보드', exact: true },
  { href: '/ops/members', label: '회원' },
  { href: '/ops/subscriptions', label: '구독' },
  { href: '/ops/managers/pending', label: '매니저 승인' },
];

export default function OpsNav({ username }: { username: string }) {
  const pathname = usePathname();
  return (
    <header className="border-b border-slate-800 bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Show Me The Plan
          </p>
          <h1 className="text-lg font-semibold">운영 Admin</h1>
        </div>
        <nav className="flex flex-wrap gap-2">
          {NAV_ITEMS.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-1.5 text-sm transition ${
                  active
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <p className="text-sm text-slate-400">{username}</p>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-slate-900 hover:text-white"
          >
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}
