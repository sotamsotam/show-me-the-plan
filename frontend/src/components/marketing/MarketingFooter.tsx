import { MAIN_SLOGAN, NAV_LINKS } from '@/content/marketing/common';
import { OPERATOR_INFO } from '@/content/legal/meta';
import Link from 'next/link';

export default function MarketingFooter() {
  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-b border-gray-800 pb-8 text-sm">
          <Link href="/legal/terms" className="font-semibold text-white hover:text-blue-300">
            이용약관
          </Link>
          <Link href="/legal/paid-service" className="hover:text-white">
            유료서비스 약관
          </Link>
          <Link href="/legal/privacy" className="hover:text-white">
            개인정보 처리방침
          </Link>
          <Link href="/pricing" className="hover:text-white">
            요금 안내
          </Link>
        </div>

        <div className="grid gap-10 pt-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <p className="text-lg font-bold text-white">{OPERATOR_INFO.serviceName}</p>
            <p className="mt-3 max-w-md text-sm leading-relaxed">{MAIN_SLOGAN}</p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">학령별</p>
            <nav className="mt-4 flex flex-col gap-2.5 text-sm">
              {NAV_LINKS.filter((l) => l.href !== '/').map((link) => (
                <Link key={link.href} href={link.href} className="hover:text-white">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">대상별</p>
            <nav className="mt-4 flex flex-col gap-2.5 text-sm">
              <Link href="/for-parents" className="hover:text-white">
                학부모·선생님
              </Link>
              <Link href="/for-students" className="hover:text-white">
                중·고등학생
              </Link>
            </nav>
          </div>
        </div>

        <div className="mt-10 border-t border-gray-800 pt-8 text-center text-xs leading-relaxed">
          <p>
            {OPERATOR_INFO.serviceName} · {OPERATOR_INFO.operatorName}
          </p>
          <p className="mt-2">
            문의:{' '}
            <a href={`mailto:${OPERATOR_INFO.contactEmail}`} className="hover:text-white">
              {OPERATOR_INFO.contactEmail}
            </a>
          </p>
          <p className="mt-4 text-gray-500">
            © {new Date().getFullYear()} {OPERATOR_INFO.serviceName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
