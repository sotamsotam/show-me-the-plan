'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type DiscountFormState = {
  discountPercent: string;
  discountFixedAmount: string;
  overridePrice: string;
  discountStartsAt: string;
  discountEndsAt: string;
  discountApplyOnce: boolean;
  discountNote: string;
};

type PreviewResult = {
  planPrice: number;
  nextBilling: {
    planPrice: number;
    discountAmount: number;
    billedAmount: number;
    skipPgCharge: boolean;
  };
};

function toInputDate(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 16);
}

function buildPayload(form: DiscountFormState): Record<string, unknown> {
  return {
    discountPercent: form.discountPercent === '' ? null : Number(form.discountPercent),
    discountFixedAmount:
      form.discountFixedAmount === '' ? null : Number(form.discountFixedAmount),
    overridePrice: form.overridePrice === '' ? null : Number(form.overridePrice),
    discountStartsAt: form.discountStartsAt
      ? new Date(form.discountStartsAt).toISOString()
      : null,
    discountEndsAt: form.discountEndsAt ? new Date(form.discountEndsAt).toISOString() : null,
    discountApplyOnce: form.discountApplyOnce,
    discountNote: form.discountNote.trim() || null,
  };
}

export default function OpsDiscountEditor({
  userId,
  initial,
}: {
  userId: number;
  initial: {
    discountPercent: number | null;
    discountFixedAmount: number | null;
    overridePrice: number | null;
    discountStartsAt: string | null;
    discountEndsAt: string | null;
    discountApplyOnce?: boolean;
    discountNote: string | null;
  } | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState<DiscountFormState>({
    discountPercent:
      initial?.discountPercent != null ? String(initial.discountPercent) : '',
    discountFixedAmount:
      initial?.discountFixedAmount != null ? String(initial.discountFixedAmount) : '',
    overridePrice: initial?.overridePrice != null ? String(initial.overridePrice) : '',
    discountStartsAt: toInputDate(initial?.discountStartsAt),
    discountEndsAt: toInputDate(initial?.discountEndsAt),
    discountApplyOnce: initial?.discountApplyOnce ?? false,
    discountNote: initial?.discountNote ?? '',
  });
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  async function handlePreview() {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/ops/subscriptions/${userId}/discount/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload(form)),
    });

    const data = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      setError(data?.error ?? '미리보기에 실패했습니다.');
      return;
    }

    setPreview(data as PreviewResult);
    setShowModal(true);
  }

  async function handleSave() {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/ops/subscriptions/${userId}/discount`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload(form)),
    });

    const data = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      setError(data?.error ?? '저장에 실패했습니다.');
      return;
    }

    setShowModal(false);
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
      <h3 className="text-sm font-medium text-slate-300">할인 편집</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="text-slate-400">할인율 (%)</span>
          <input
            type="number"
            min={0}
            max={100}
            value={form.discountPercent}
            onChange={(e) => setForm((prev) => ({ ...prev, discountPercent: e.target.value }))}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-400">고정 할인 (원)</span>
          <input
            type="number"
            min={0}
            value={form.discountFixedAmount}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, discountFixedAmount: e.target.value }))
            }
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-400">오버라이드 가격 (원)</span>
          <input
            type="number"
            min={0}
            value={form.overridePrice}
            onChange={(e) => setForm((prev) => ({ ...prev, overridePrice: e.target.value }))}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-400">메모</span>
          <input
            value={form.discountNote}
            onChange={(e) => setForm((prev) => ({ ...prev, discountNote: e.target.value }))}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-400">할인 시작</span>
          <input
            type="datetime-local"
            value={form.discountStartsAt}
            onChange={(e) => setForm((prev) => ({ ...prev, discountStartsAt: e.target.value }))}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-400">할인 종료</span>
          <input
            type="datetime-local"
            value={form.discountEndsAt}
            onChange={(e) => setForm((prev) => ({ ...prev, discountEndsAt: e.target.value }))}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300 sm:col-span-2">
          <input
            type="checkbox"
            checked={form.discountApplyOnce}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, discountApplyOnce: e.target.checked }))
            }
            className="rounded border-slate-600"
          />
          1회만 적용 (discountApplyOnce)
        </label>
      </div>

      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={handlePreview}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
        >
          미리보기
        </button>
      </div>

      {showModal && preview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-6 text-slate-100">
            <h4 className="text-lg font-semibold">실청구 미리보기</h4>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-400">정가</dt>
                <dd>{preview.planPrice.toLocaleString('ko-KR')}원</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">할인액</dt>
                <dd>{preview.nextBilling.discountAmount.toLocaleString('ko-KR')}원</dd>
              </div>
              <div className="flex justify-between font-medium">
                <dt>청구 예정</dt>
                <dd>{preview.nextBilling.billedAmount.toLocaleString('ko-KR')}원</dd>
              </div>
            </dl>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-md border border-slate-600 px-4 py-2 text-sm"
              >
                취소
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleSave}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
