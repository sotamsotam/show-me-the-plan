'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import BillingDisclosure from '@/components/billing/BillingDisclosure';
import PaymentHistoryTable, {
  type PaymentHistoryRow,
} from '@/components/billing/PaymentHistoryTable';
import SubscriptionPointsSection from '@/components/billing/SubscriptionPointsSection';
import {
  formatBillingInterval,
  formatKrw,
  formatSubscriptionStatus,
} from '@/lib/billing/format';
import { getTrialDaysRemaining } from '@/lib/subscription-access';
import type { SubscriptionSummary } from '@/types/subscription';

export default function BillingSettingsClient() {
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);
  const [payments, setPayments] = useState<PaymentHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [resuming, setResuming] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [subscriptionRes, historyRes] = await Promise.all([
          fetch('/api/subscription/me'),
          fetch('/api/billing/history'),
        ]);

        const subscriptionData = await subscriptionRes.json();
        const historyData = await historyRes.json();

        if (!subscriptionRes.ok) {
          throw new Error(subscriptionData.error ?? '구독 정보 조회에 실패했습니다.');
        }

        if (!cancelled) {
          setSubscription(subscriptionData.subscription ?? null);
          setPayments(historyRes.ok ? historyData.payments ?? [] : []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : '구독 정보를 불러오지 못했습니다.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCancel() {
    if (!window.confirm('해지 예약을 신청하시겠습니까?')) {
      return;
    }

    setCanceling(true);
    setError(null);

    try {
      const res = await fetch('/api/billing/subscription/cancel', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? '구독 해지 예약에 실패했습니다.');
      }

      setSubscription(data.subscription ?? null);
    } catch (cancelError) {
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : '구독 해지 예약에 실패했습니다.'
      );
    } finally {
      setCanceling(false);
    }
  }

  async function handleResumeCancel() {
    setResuming(true);
    setError(null);

    try {
      const res = await fetch('/api/billing/subscription/resume', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? '해지 예약 취소에 실패했습니다.');
      }

      setSubscription(data.subscription ?? null);
    } catch (resumeError) {
      setError(
        resumeError instanceof Error
          ? resumeError.message
          : '해지 예약 취소에 실패했습니다.'
      );
    } finally {
      setResuming(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] w-full flex-col items-center justify-center">
        <p className="text-sm text-gray-600 dark:text-gray-300">구독 정보를 불러오는 중...</p>
      </div>
    );
  }

  if (error && !subscription) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  const periodEnd = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('ko-KR')
    : '-';
  const trialDaysRemaining = getTrialDaysRemaining(subscription);

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-12 pt-12">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">구독 · 결제</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          학생 계정 구독 상태와 결제 내역을 확인할 수 있습니다.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">현재 상태</p>
            <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
              {subscription?.status
                ? formatSubscriptionStatus(subscription.status)
                : '알 수 없음'}
            </p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              이용 가능까지: {periodEnd}
            </p>
            {trialDaysRemaining !== null ? (
              <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                무료 체험 D-{trialDaysRemaining}
              </p>
            ) : null}
            {subscription?.nextBilling ? (
              <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                <p>정가: {formatKrw(subscription.nextBilling.planPrice)}</p>
                {subscription.nextBilling.discountAmount -
                  subscription.nextBilling.pointAmountUsed >
                0 ? (
                  <p>
                    할인: -
                    {formatKrw(
                      subscription.nextBilling.discountAmount -
                        subscription.nextBilling.pointAmountUsed
                    )}
                  </p>
                ) : null}
                {subscription.nextBilling.pointAmountUsed > 0 ? (
                  <p>포인트: -{formatKrw(subscription.nextBilling.pointAmountUsed)}</p>
                ) : null}
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  다음 청구 예정액: {formatKrw(subscription.nextBilling.billedAmount)}
                  {subscription.plan?.interval
                    ? ` / ${formatBillingInterval(subscription.plan.interval)}`
                    : ''}
                </p>
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/billing/checkout"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              구독 시작 / 카드 등록
            </Link>
            {!subscription?.cancelAtPeriodEnd ? (
              <button
                type="button"
                disabled={canceling}
                onClick={handleCancel}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 disabled:opacity-60 dark:border-neutral-700 dark:text-gray-200"
              >
                {canceling ? '처리 중...' : '해지 예약'}
              </button>
            ) : (
              <>
                <span className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-600 dark:bg-zinc-800 dark:text-gray-300">
                  해지 예약됨 ({periodEnd}까지 이용)
                </span>
                <button
                  type="button"
                  disabled={resuming}
                  onClick={handleResumeCancel}
                  className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 disabled:opacity-60 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300"
                >
                  {resuming ? '처리 중...' : '해지 예약 취소'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {subscription ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">포인트</h2>
          <div className="mt-4">
            <SubscriptionPointsSection
              subscription={subscription}
              onUpdated={setSubscription}
            />
          </div>
        </div>
      ) : null}

      <BillingDisclosure />

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">결제 내역</h2>
          {payments.length > 0 ? (
            <Link
              href="/dashboard/settings/billing/history"
              className="text-sm text-blue-600 hover:underline"
            >
              전체 보기
            </Link>
          ) : null}
        </div>
        <div className="mt-4">
          <PaymentHistoryTable payments={payments} compact />
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}
