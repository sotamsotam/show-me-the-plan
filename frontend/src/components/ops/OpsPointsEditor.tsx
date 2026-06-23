'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function OpsPointsEditor({
  userId,
  initialPointBalance,
  usePointsOnNextBilling,
}: {
  userId: number;
  initialPointBalance: number;
  usePointsOnNextBilling: boolean;
}) {
  const router = useRouter();
  const [pointBalance, setPointBalance] = useState(String(initialPointBalance));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const parsed = Number(pointBalance);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
      setError('포인트 잔액은 0 이상의 정수여야 합니다.');
      setSaving(false);
      return;
    }

    const res = await fetch(`/api/ops/subscriptions/${userId}/points`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pointBalance: parsed }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? '포인트 저장에 실패했습니다.');
      setSaving(false);
      return;
    }

    setSuccess('포인트 잔액을 저장했습니다.');
    setSaving(false);
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
      <h3 className="text-sm font-medium text-slate-300">포인트 관리</h3>
      <p className="mt-2 text-sm text-slate-400">
        1P = 1원입니다. 기존 잔액에 추가할 때는 합산한 최종 잔액을 직접 입력하세요.
      </p>
      {usePointsOnNextBilling ? (
        <p className="mt-2 text-sm text-amber-300">
          학생이 다음 청구에 포인트 사용을 예약한 상태입니다.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="block text-sm">
          <span className="text-slate-400">보유 포인트 (P)</span>
          <input
            type="number"
            min={0}
            step={1}
            value={pointBalance}
            onChange={(event) => setPointBalance(event.target.value)}
            className="mt-1 w-40 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          />
        </label>
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? '저장 중...' : '잔액 저장'}
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      {success ? <p className="mt-3 text-sm text-emerald-300">{success}</p> : null}
    </section>
  );
}
