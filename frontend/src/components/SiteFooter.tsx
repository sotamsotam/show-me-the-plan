import Link from 'next/link';
import { OPERATOR_INFO } from '@/content/legal/meta';

type SiteFooterProps = {
  tone?: 'light' | 'dark';
};

export default function SiteFooter({ tone = 'light' }: SiteFooterProps) {
  const isDark = tone === 'dark';

  return (
    <footer
      className={
        isDark
          ? 'border-t border-white/10 bg-[#0a1120] px-4 py-6'
          : 'border-t border-gray-200 bg-gray-50 px-4 py-6 dark:border-neutral-800 dark:bg-zinc-950'
      }
    >
      <div
        className={`mx-auto flex max-w-4xl flex-col items-center gap-3 text-center text-xs ${
          isDark ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <Link
            href="/legal/terms"
            className={
              isDark ? 'hover:text-gray-200' : 'hover:text-gray-700 dark:hover:text-gray-200'
            }
          >
            이용약관
          </Link>
          <Link
            href="/legal/paid-service"
            className={
              isDark ? 'hover:text-gray-200' : 'hover:text-gray-700 dark:hover:text-gray-200'
            }
          >
            유료서비스 약관
          </Link>
          <Link
            href="/legal/privacy"
            className={
              isDark ? 'hover:text-gray-200' : 'hover:text-gray-700 dark:hover:text-gray-200'
            }
          >
            개인정보 처리방침
          </Link>
        </nav>
        <p className={isDark ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'}>
          {OPERATOR_INFO.serviceDescription}
        </p>
        <p>
          {OPERATOR_INFO.serviceName} · {OPERATOR_INFO.operatorName}
        </p>
        <p>
          문의:{' '}
          <a
            href={`mailto:${OPERATOR_INFO.contactEmail}`}
            className={
              isDark ? 'hover:text-gray-200' : 'hover:text-gray-700 dark:hover:text-gray-200'
            }
          >
            {OPERATOR_INFO.contactEmail}
          </a>
        </p>
      </div>
    </footer>
  );
}
