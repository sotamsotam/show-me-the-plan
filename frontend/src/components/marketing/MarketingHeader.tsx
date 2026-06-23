import MarketingCtaButton from '@/components/marketing/MarketingCtaButton';
import MarketingMobileNav from '@/components/marketing/MarketingMobileNav';
import { authOptions } from '@/lib/auth';
import {
  getDefaultDashboardPathFromSession,
  getMarketingAppEntryFromSession,
} from '@/lib/account-helpers';
import { NAV_LINKS, SERVICE_NAME } from '@/content/marketing/common';
import { getServerSession } from 'next-auth';
import Link from 'next/link';

export default async function MarketingHeader() {
  const session = await getServerSession(authOptions);
  const appEntry = session?.user
    ? getMarketingAppEntryFromSession(session.user)
    : null;
  const logoHref = session?.user
    ? getDefaultDashboardPathFromSession(session.user)
    : '/';

  return (
    <header className="sticky top-0 z-50 border-b border-mkt-border bg-mkt-surface shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 pt-3 pb-4 sm:px-6 sm:pt-4 sm:pb-5">
        <Link href={logoHref} className="flex shrink-0 items-center">
          <img
            src="/logo/logo_wide_pc.png"
            alt={SERVICE_NAME}
            className="h-9 w-auto max-w-[160px] object-contain sm:h-10"
          />
        </Link>

        <nav className="hidden items-center gap-7 text-[15px] font-medium text-mkt-text-muted lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-mkt-primary-light"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {session?.user && appEntry ? (
            <MarketingCtaButton
              label={appEntry.label}
              href={appEntry.href}
              variant="primary"
              size="md"
            />
          ) : (
            <>
              <Link
                href="/login"
                className="hidden rounded-full px-4 py-2.5 text-sm font-semibold text-mkt-text-muted transition-colors hover:bg-mkt-surface-alt sm:inline-flex"
              >
                로그인
              </Link>
              <MarketingCtaButton
                label="무료로 시작하기"
                href="/signup"
                variant="primary"
                size="md"
              />
            </>
          )}
        </div>
      </div>

      <MarketingMobileNav />
    </header>
  );
}
