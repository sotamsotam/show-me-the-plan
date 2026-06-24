'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { formatKrw } from '@/lib/billing/format';
import type { SubscriptionSummary } from '@/types/subscription';

const REVIEW_POINTS_EVENT_MESSAGE =
  '우수리뷰 선정시 바로 사용하실 수 있는 10,000P 를 적립해 드립니다. 리뷰를 작성 하시겠습니까?';

export default function SubscriptionPointsSection({
  subscription,
  onUpdated,
}: {
  subscription: SubscriptionSummary;
  onUpdated?: (subscription: SubscriptionSummary) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleUsePoints() {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/subscription/use-points', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? '포인트 사용 예약에 실패했습니다.');
      }

      if (data.subscription) {
        onUpdated?.(data.subscription);
      }

      setSuccess('다음 청구 시 포인트가 자동으로 차감됩니다.');
    } catch (useError) {
      setError(
        useError instanceof Error ? useError.message : '포인트 사용 예약에 실패했습니다.'
      );
    } finally {
      setLoading(false);
    }
  }

  function handleReviewPointsEvent() {
    if (!window.confirm(REVIEW_POINTS_EVENT_MESSAGE)) {
      return;
    }

    router.push('/reviews#write');
  }

  const pointBalance = subscription.pointBalance ?? 0;
  const promoDiscount =
    (subscription.nextBilling?.discountAmount ?? 0) -
    (subscription.nextBilling?.pointAmountUsed ?? 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          보유 포인트:{' '}
          <span className="font-semibold">{pointBalance.toLocaleString('ko-KR')}P</span>
          <span className="text-blue-700/80 dark:text-blue-300/80"> (1P = 1원)</span>
        </p>
        <button
          type="button"
          onClick={handleReviewPointsEvent}
          className="inline-flex shrink-0 items-center rounded-full border border-amber-300/80 bg-gradient-to-r from-amber-50 to-orange-50 px-2.5 py-0.5 text-xs font-semibold tracking-tight text-amber-900 shadow-sm transition hover:border-amber-400 hover:from-amber-100 hover:to-orange-100 active:scale-[0.98] dark:border-amber-700 dark:from-amber-950/90 dark:to-orange-950/90 dark:text-amber-100 dark:hover:from-amber-900 dark:hover:to-orange-900"
        >
          리뷰작성 포인트 적립 이벤트
        </button>
      </div>

      {subscription.usePointsOnNextBilling && subscription.nextBilling ? (
        <div className="rounded-lg border border-blue-200 bg-white/70 p-3 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-100">
          <p className="font-medium">다음 청구에 포인트 적용 예정</p>
          <p className="mt-1">
            포인트 사용: -{formatKrw(subscription.nextBilling.pointAmountUsed)}
          </p>
          {promoDiscount > 0 ? (
            <p>기타 할인: -{formatKrw(promoDiscount)}</p>
          ) : null}
          <p className="mt-1 font-medium">
            예상 청구액: {formatKrw(subscription.nextBilling.billedAmount)}
          </p>
        </div>
      ) : null}

      {pointBalance > 0 ? (
        <button
          type="button"
          disabled={loading || subscription.usePointsOnNextBilling}
          onClick={handleUsePoints}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? '처리 중...'
            : subscription.usePointsOnNextBilling
              ? '다음 청구에 적용됨'
              : '포인트 사용'}
        </button>
      ) : null}

      {pointBalance > 0 && !subscription.usePointsOnNextBilling ? (
        <p className="text-xs text-blue-700 dark:text-blue-300">
          버튼을 누르면 다음 1회 청구에서 보유 포인트만큼 자동 할인됩니다.
        </p>
      ) : null}

      {error ? <p className="text-sm text-red-600 dark:text-red-300">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-700 dark:text-emerald-300">{success}</p> : null}
    </div>
  );
}
