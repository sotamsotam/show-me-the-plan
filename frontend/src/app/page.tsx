import { authOptions } from '@/lib/auth';
import SiteFooter from '@/components/SiteFooter';
import { getServerSession } from 'next-auth';
import Link from 'next/link';

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg text-center">
        <h1 className="mb-3 flex justify-center">
          <img
            src="/logo/logo_wide_pc.png"
            alt="Show Me The Plan"
            className="h-16 w-auto max-w-full object-contain"
          />
        </h1>
        <p className="mb-8 text-gray-600 dark:text-gray-400">
          계획을 플레이하는 순간, 공부는 퀘스트가 된다.
        </p>

        {session?.user ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {session.user.username}
              </span>
              님, 환영합니다.
            </p>
            <div className="flex justify-center gap-3">
              <Link
                href="/dashboard/todo"
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                오늘의 스터디플랜
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex justify-center gap-3">
            <Link
              href="/login"
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-zinc-800"
            >
              로그인
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              회원가입
            </Link>
          </div>
        )}
      </div>
      </main>
      <SiteFooter />
    </div>
  );
}
