'use client';

import EmailHintModal from '@/app/forgot-password/EmailHintModal';
import Link from 'next/link';
import { FormEvent, useRef, useState } from 'react';
import type { TurnstileInstance } from '@marsidev/react-turnstile';
import TurnstileWidget from '@/components/TurnstileWidget';
import {
  isTurnstileWidgetEnabled,
  TURNSTILE_VERIFICATION_FAILED_MESSAGE,
} from '@/lib/turnstile-client';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailHintOpen, setEmailHintOpen] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const turnstileRequired = isTurnstileWidgetEnabled();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (turnstileRequired && !turnstileToken) {
      setError(TURNSTILE_VERIFICATION_FAILED_MESSAGE);
      return;
    }

    setLoading(true);

    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, turnstileToken }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? '요청 처리에 실패했습니다.');
      setTurnstileToken(null);
      turnstileRef.current?.reset();
      return;
    }

    setSuccess(data.message ?? '등록된 이메일이면 비밀번호 재설정 안내 메일을 보냈습니다.');
    setEmail('');
    setTurnstileToken(null);
    turnstileRef.current?.reset();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
        <h1 className="mb-2 text-2xl font-semibold">비밀번호 찾기</h1>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          가입 시 사용한 이메일을 입력하면 비밀번호 재설정 링크를 보내 드립니다.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              이메일
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-zinc-800"
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {success && (
            <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
              {success}
            </p>
          )}

          <TurnstileWidget
            ref={turnstileRef}
            onTokenChange={setTurnstileToken}
            onError={() => setError(TURNSTILE_VERIFICATION_FAILED_MESSAGE)}
            className="flex justify-center"
          />

          <button
            type="submit"
            disabled={loading || (turnstileRequired && !turnstileToken)}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '전송 중...' : '재설정 링크 보내기'}
          </button>
        </form>

        <div className="mt-6 space-y-2 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            <Link href="/login" className="text-blue-600 hover:underline">
              로그인으로 돌아가기
            </Link>
          </p>
          <p>
            <button
              type="button"
              onClick={() => setEmailHintOpen(true)}
              className="text-blue-600 hover:underline"
            >
              이메일도 기억나지 않으실 경우
            </button>
          </p>
        </div>
      </div>

      <EmailHintModal open={emailHintOpen} onClose={() => setEmailHintOpen(false)} />
    </main>
  );
}
