'use client';

import { HEADER_NAV_LINKS } from '@/content/marketing/common';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

function isActive(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function MarketingMobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex gap-5 overflow-x-auto border-t border-mkt-border px-4 [-ms-overflow-style:none] [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden"
      aria-label="주요 메뉴"
    >
      {HEADER_NAV_LINKS.map((link) => {
        const active = isActive(pathname, link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`shrink-0 border-b-2 py-2 text-sm font-medium transition-colors ${
              active
                ? 'border-mkt-accent text-mkt-primary'
                : 'border-transparent text-mkt-text-subtle hover:border-mkt-primary-light/40 hover:text-mkt-primary-light'
            }`}
            aria-current={active ? 'page' : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
