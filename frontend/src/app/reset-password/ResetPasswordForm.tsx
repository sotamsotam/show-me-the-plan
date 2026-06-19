'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import PasswordInput from '@/components/PasswordInput';
import { FormEvent, useState } from 'react';

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code') ?? '';

  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!code) {
      setError('유효하지 않은 재설정 링크입니다.');
      return;
    }

    if (password !== passwordConfirmation) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (password.length < 6) {
      setError('새 비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    setLoading(true);

    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, password, passwordConfirmation }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? '비밀번호 재설정에 실패했습니다.');
      return;
    }

    router.push('/login?reset=success');
    router.refresh();
  }

  if (!code) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
          <h1 className="mb-2 text-2xl font-semibold">비밀번호 재설정</h1>
          <p className="mb-6 text-sm text-red-600 dark:text-red-400">
            유효하지 않은 재설정 링크입니다. 링크가 만료되었거나 잘못된 주소일 수 있습니다.
          </p>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            <Link href="/forgot-password" className="text-blue-600 hover:underline">
              비밀번호 찾기 다시 요청
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
        <h1 className="mb-2 text-2xl font-semibold">비밀번호 재설정</h1>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          새 비밀번호를 입력해 주세요.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              새 비밀번호
            </label>
            <PasswordInput
              id="password"
              value={password}
              onChange={setPassword}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-zinc-800"
            />
          </div>

          <div>
            <label
              htmlFor="passwordConfirmation"
              className="mb-1 block text-sm font-medium"
            >
              새 비밀번호 확인
            </label>
            <PasswordInput
              id="passwordConfirmation"
              value={passwordConfirmation}
              onChange={setPasswordConfirmation}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-zinc-800"
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '변경 중...' : '비밀번호 변경'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <Link href="/login" className="text-blue-600 hover:underline">
            로그인으로 돌아가기
          </Link>
        </p>
      </div>
    </main>
  );
}
