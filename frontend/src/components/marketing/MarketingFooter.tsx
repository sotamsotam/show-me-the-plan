import { MAIN_SLOGAN, NAV_LINKS } from '@/content/marketing/common';
import { OPERATOR_INFO } from '@/content/legal/meta';
import Link from 'next/link';

function OperatorLegalLines() {
  const segments = [
    OPERATOR_INFO.operatorName,
    OPERATOR_INFO.representativeName
      ? `대표 ${OPERATOR_INFO.representativeName}`
      : null,
    OPERATOR_INFO.businessRegistrationNumber
      ? `사업자등록번호 ${OPERATOR_INFO.businessRegistrationNumber}`
      : null,
    OPERATOR_INFO.businessAddress ? `주소 ${OPERATOR_INFO.businessAddress}` : null,
  ].filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  return (
    <p className="mt-3 text-xs leading-relaxed text-white/55">
      {segments.join(' · ')}
    </p>
  );
}

export default function MarketingFooter() {
  const serviceHost = (() => {
    try {
      return new URL(OPERATOR_INFO.serviceUrl).host;
    } catch {
      return OPERATOR_INFO.serviceUrl;
    }
  })();

  return (
    <footer className="bg-mkt-footer text-mkt-text-subtle">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-b border-white/10 pb-8 text-sm">
          <Link
            href="/legal/terms"
            className="font-semibold text-white hover:text-mkt-text-on-accent"
          >
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

        <div className="grid gap-10 pt-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <p className="text-lg font-bold text-white">
              {OPERATOR_INFO.serviceName}
              <span className="ml-2 text-sm font-medium text-white/60">
                {OPERATOR_INFO.serviceNameKo}
              </span>
            </p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/75">
              {OPERATOR_INFO.serviceDescription}
            </p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/55">
              {MAIN_SLOGAN}
            </p>
            <OperatorLegalLines />
          </div>

          <div className="lg:col-span-2">
            <p className="text-xs font-bold uppercase tracking-wider text-white/50">학령별</p>
            <nav className="mt-4 flex flex-col gap-2.5 text-sm">
              {NAV_LINKS.filter((l) => l.href !== '/').map((link) => (
                <Link key={link.href} href={link.href} className="hover:text-white">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="lg:col-span-2">
            <p className="text-xs font-bold uppercase tracking-wider text-white/50">대상별</p>
            <nav className="mt-4 flex flex-col gap-2.5 text-sm">
              <Link href="/for-parents" className="hover:text-white">
                학부모·선생님
              </Link>
              <Link href="/for-students" className="hover:text-white">
                중·고등학생
              </Link>
            </nav>
          </div>

          <div className="lg:col-span-3">
            <p className="text-xs font-bold uppercase tracking-wider text-white/50">고객지원</p>
            <div className="mt-4 flex flex-col gap-2.5 text-sm">
              <p>
                문의:{' '}
                <a
                  href={`mailto:${OPERATOR_INFO.contactEmail}`}
                  className="text-white/90 hover:text-white"
                >
                  {OPERATOR_INFO.contactEmail}
                </a>
              </p>
              <p>
                서비스:{' '}
                <a
                  href={OPERATOR_INFO.serviceUrl}
                  className="text-white/90 hover:text-white"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {serviceHost}
                </a>
              </p>
              <Link href="/signup" className="text-mkt-text-on-accent hover:text-white">
                무료로 시작하기 →
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-8 text-center text-xs leading-relaxed text-white/50">
          <p>
            © {new Date().getFullYear()} {OPERATOR_INFO.serviceName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
