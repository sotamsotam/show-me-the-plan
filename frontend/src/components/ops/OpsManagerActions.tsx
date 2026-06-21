'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function OpsManagerActions({ userId }: { userId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAction(action: 'approve' | 'reject') {
    setLoading(action);
    setError(null);

    const res = await fetch(`/api/ops/managers/${userId}/${action}`, {
      method: 'POST',
    });

    const data = await res.json().catch(() => null);
    setLoading(null);

    if (!res.ok) {
      setError(data?.error ?? '처리에 실패했습니다.');
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={loading != null}
          onClick={() => handleAction('approve')}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          승인
        </button>
        <button
          type="button"
          disabled={loading != null}
          onClick={() => handleAction('reject')}
          className="rounded-md bg-red-700 px-3 py-1.5 text-sm text-white hover:bg-red-600 disabled:opacity-50"
        >
          거절
        </button>
      </div>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
