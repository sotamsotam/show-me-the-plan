'use client';

import { FormEvent, useEffect, useState } from 'react';

interface EmailHintModalProps {
  open: boolean;
  onClose: () => void;
}

export default function EmailHintModal({ open, onClose }: EmailHintModalProps) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setUsername('');
      setError('');
      setMaskedEmail('');
      setLoading(false);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMaskedEmail('');
    setLoading(true);

    const res = await fetch('/api/auth/email-hint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? '입력하신 닉네임과 일치하는 계정을 찾을 수 없습니다.');
      return;
    }

    setMaskedEmail(data.maskedEmail ?? '');
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-lg dark:border-neutral-700 dark:bg-zinc-900"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-hint-title"
      >
        <h2
          id="email-hint-title"
          className="text-lg font-semibold text-gray-900 dark:text-gray-100"
        >
          가입 이메일 확인
        </h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          가입 시 설정한 닉네임을 입력하면 등록된 이메일의 일부를 안내해 드립니다.
        </p>

        {maskedEmail ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:bg-blue-950 dark:text-blue-100">
              <p className="font-medium">등록된 이메일</p>
              <p className="mt-1 font-mono text-base">{maskedEmail}</p>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              위 이메일로 비밀번호 재설정 링크를 받을 수 있습니다.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              확인
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="email-hint-username" className="mb-1 block text-sm font-medium">
                가입 닉네임
              </label>
              <input
                id="email-hint-username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                minLength={3}
                autoFocus
                autoComplete="username"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-zinc-800"
              />
            </div>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-neutral-700 dark:text-gray-200 dark:hover:bg-zinc-800"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '확인 중...' : '이메일 확인'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
