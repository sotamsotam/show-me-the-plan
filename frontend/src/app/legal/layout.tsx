import Link from 'next/link';
import SiteFooter from '@/components/SiteFooter';

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-gray-200 bg-white px-4 py-4 dark:border-neutral-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link
            href="/"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            ← 홈으로
          </Link>
          <nav className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
            <Link href="/legal/terms" className="hover:text-gray-900 dark:hover:text-gray-100">
              이용약관
            </Link>
            <Link
              href="/legal/privacy"
              className="hover:text-gray-900 dark:hover:text-gray-100"
            >
              개인정보 처리방침
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
          {children}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
