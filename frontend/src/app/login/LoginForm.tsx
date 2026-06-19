'use client';

import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { AccountInfo } from '@/types/school';
import { getDefaultDashboardPath } from '@/lib/account-helpers';
import PasswordInput from '@/components/PasswordInput';
import SiteFooter from '@/components/SiteFooter';
import { FormEvent, useState } from 'react';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard';
  const registered = searchParams.get('registered') === 'true';
  const reset = searchParams.get('reset') === 'success';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn('credentials', {
      identifier,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError('이메일/사용자명 또는 비밀번호가 올바르지 않습니다.');
      return;
    }

    try {
      const profileRes = await fetch('/api/profile/me', { credentials: 'include' });
      const profileData = await profileRes.json();

      if (profileRes.ok) {
        const account: AccountInfo = {
          user: profileData.user ?? null,
          role: profileData.role ?? null,
          profile: profileData.profile ?? null,
        };

        const target =
          searchParams.get('callbackUrl') ?? getDefaultDashboardPath(account);
        router.push(target);
        router.refresh();
        return;
      }
    } catch {
      // fallback to default redirect
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
        <h1 className="mb-2 text-2xl font-semibold">로그인</h1>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          Show Me The Plan 계정으로 로그인하세요.
        </p>

        {registered && (
          <p className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
            회원가입이 완료되었습니다. 로그인해 주세요.
          </p>
        )}

        {reset && (
          <p className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
            비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="identifier"
              className="mb-1 block text-sm font-medium"
            >
              이메일 또는 사용자명
            </label>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-zinc-800"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium">
                비밀번호
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-blue-600 hover:underline"
              >
                비밀번호를 잊으셨나요?
              </Link>
            </div>
            <PasswordInput
              id="password"
              value={password}
              onChange={setPassword}
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-zinc-800"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          계정이 없으신가요?{' '}
          <Link href="/signup" className="text-blue-600 hover:underline">
            회원가입
          </Link>
        </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
