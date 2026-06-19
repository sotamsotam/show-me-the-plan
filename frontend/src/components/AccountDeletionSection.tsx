'use client';

import { signOut } from 'next-auth/react';
import { FormEvent, useState } from 'react';
import PasswordInput from '@/components/PasswordInput';

export default function AccountDeletionSection() {
  const [password, setPassword] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [deleting, setDeleting] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setModalError('');

    if (!confirmed) {
      setError('탈퇴 안내 확인에 체크해 주세요.');
      return;
    }

    if (!password) {
      setError('비밀번호를 입력해 주세요.');
      return;
    }

    setShowModal(true);
  }

  async function handleConfirmDelete() {
    setDeleting(true);
    setError('');
    setModalError('');

    try {
      const res = await fetch('/api/profile/me/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });

      const data = await res.json().catch(() => ({}));
      const message =
        typeof data.error === 'string' ? data.error : '회원 탈퇴에 실패했습니다.';

      if (!res.ok) {
        setModalError(message);
        setError(message);
        return;
      }

      await signOut({ callbackUrl: '/' });
    } catch {
      const message = '회원 탈퇴에 실패했습니다.';
      setModalError(message);
      setError(message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <section className="mt-6 space-y-4 rounded-xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-900/50 dark:bg-zinc-900">
        <h2 className="text-lg font-medium text-red-700 dark:text-red-400">회원 탈퇴</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          탈퇴 시 계정, 학습 일정, 스터디 플랜, TODO, 통계 및 매니저 연결 정보가 모두
          삭제되며 복구할 수 없습니다.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="delete-password" className="mb-1 block text-sm font-medium">
              비밀번호 확인
            </label>
            <PasswordInput
              id="delete-password"
              value={password}
              onChange={setPassword}
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-zinc-800"
            />
          </div>

          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 accent-red-600"
            />
            <span>탈퇴 시 모든 데이터가 삭제되며 복구할 수 없음을 확인했습니다.</span>
          </label>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={deleting}
            className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            회원 탈퇴
          </button>
        </form>
      </section>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-lg dark:border-neutral-700 dark:bg-zinc-900"
          >
            <h3
              id="delete-account-title"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              정말 탈퇴하시겠습니까?
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              이 작업은 되돌릴 수 없습니다. 모든 학습 데이터가 삭제됩니다.
            </p>

            {modalError && (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">{modalError}</p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={deleting}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-zinc-800"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? '탈퇴 중...' : '탈퇴하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
