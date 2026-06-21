import MarketingCtaButton from '@/components/marketing/MarketingCtaButton';
import { authOptions } from '@/lib/auth';
import { NAV_LINKS, SERVICE_NAME } from '@/content/marketing/common';
import { getServerSession } from 'next-auth';
import Link from 'next/link';

export default async function MarketingHeader() {
  const session = await getServerSession(authOptions);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center">
          <img
            src="/logo/logo_wide_pc.png"
            alt={SERVICE_NAME}
            className="h-9 w-auto max-w-[160px] object-contain sm:h-10"
          />
        </Link>

        <nav className="hidden items-center gap-8 text-[15px] font-semibold text-gray-700 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-blue-600"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {session?.user ? (
            <MarketingCtaButton
              label="오늘의 스터디플랜"
              href="/dashboard/todo"
              variant="primary"
              size="md"
            />
          ) : (
            <>
              <Link
                href="/login"
                className="hidden rounded-full px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 sm:inline-flex"
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

      <nav className="flex gap-1 overflow-x-auto border-t border-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-600 lg:hidden">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="shrink-0 rounded-full px-4 py-1.5 transition-colors hover:bg-gray-100 hover:text-blue-600"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
