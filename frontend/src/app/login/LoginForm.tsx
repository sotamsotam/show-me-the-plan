'use client';

import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { AccountInfo } from '@/types/school';
import { getDefaultDashboardPathFromAccount, isSafeInternalCallbackPath } from '@/lib/account-helpers';
import PasswordInput from '@/components/PasswordInput';
import SiteFooter from '@/components/SiteFooter';
import { SERVICE_NAME } from '@/content/marketing/common';
import { FormEvent, useState } from 'react';

const inputClassName =
  'w-full rounded-xl border border-gray-200 bg-gray-50/80 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-[border-color,box-shadow,background-color] placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallbackUrl = searchParams.get('callbackUrl');
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

        const target = isSafeInternalCallbackPath(rawCallbackUrl)
          ? rawCallbackUrl
          : getDefaultDashboardPathFromAccount(account);
        router.push(target);
        router.refresh();
        return;
      }
    } catch {
      // fallback to default redirect
    }

    router.push(
      isSafeInternalCallbackPath(rawCallbackUrl) ? rawCallbackUrl : '/dashboard'
    );
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#092254]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_15%,rgba(29,78,216,0.12),transparent_50%),radial-gradient(ellipse_at_80%_85%,rgba(45,80,128,0.15),transparent_45%)]"
      />

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-[420px] animate-page-in">
          <Link href="/" className="mb-8 flex justify-center sm:mb-10">
            <img
              src="/logo/logo_wide_pc_blue.png"
              alt={SERVICE_NAME}
              className="h-16 w-auto object-contain"
            />
          </Link>

          <div className="rounded-2xl border border-white/10 bg-white p-7 shadow-[0_2px_8px_rgba(15,23,42,0.08),0_16px_48px_rgba(15,23,42,0.18)] sm:p-8">
            <div className="mb-6 text-center">
              <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
                로그인
              </h1>
              <p className="mt-1.5 text-sm text-gray-500">
                계정에 로그인하고 학습 계획을 이어가세요.
              </p>
            </div>

            {registered && (
              <p className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                회원가입이 완료되었습니다. 로그인해 주세요.
              </p>
            )}

            {reset && (
              <p className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="identifier"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  이메일 또는 닉네임(아이디)
                </label>
                <input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="example@email.com"
                  className={inputClassName}
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    비밀번호
                  </label>
                  <Link
                    href="/forgot-password"
                    className="shrink-0 text-xs font-medium text-blue-600 transition-colors hover:text-blue-700 hover:underline"
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
                  className={inputClassName}
                />
              </div>

              {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-[#1d4ed8] to-[#2d5080] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(29,78,216,0.28)] transition-[transform,opacity,box-shadow] hover:shadow-[0_10px_28px_rgba(29,78,216,0.36)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? '로그인 중...' : '로그인'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              계정이 없으신가요?{' '}
              <Link
                href="/signup"
                className="font-medium text-blue-600 transition-colors hover:text-blue-700 hover:underline"
              >
                회원가입
              </Link>
            </p>
          </div>

          <p className="mt-6 text-center text-xs leading-relaxed text-gray-400">
            초·중·고 학생과 학부모(매니저)를 위한
            <br className="sm:hidden" />
            {' '}분량 중심 학습 계획·실행 관리 서비스
          </p>
        </div>
      </main>

      <SiteFooter tone="dark" />
    </div>
  );
}
