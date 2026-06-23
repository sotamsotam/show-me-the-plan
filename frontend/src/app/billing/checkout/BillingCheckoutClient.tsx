'use client';

import * as PortOne from '@portone/browser-sdk/v2';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import BillingDisclosure from '@/components/billing/BillingDisclosure';
import { formatBillingInterval, formatKrw } from '@/lib/billing/format';
import { DEFAULT_MONTHLY_PLAN_CODE } from '@/types/subscription';

type PrepareResponse = {
  storeId: string;
  channelKey: string;
  customerKey: string;
  paymentId: string;
  plan: {
    code: string;
    name: string;
    price: number;
    interval: string;
  };
  nextBilling: {
    planPrice: number;
    discountAmount: number;
    pointAmountUsed: number;
    billedAmount: number;
    skipPgCharge: boolean;
  };
  guardianConsentConfirmed: boolean;
  successUrl: string;
  failUrl: string;
  error?: string;
};

async function confirmBillingCheckout(input: {
  billingKey: string;
  planCode: string;
  paymentId?: string;
}) {
  const res = await fetch('/api/billing/billing-key/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error ?? '결제 확인에 실패했습니다.');
  }

  return data;
}

export default function BillingCheckoutClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prepare, setPrepare] = useState<PrepareResponse | null>(null);
  const [paidServiceAgreed, setPaidServiceAgreed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPrepare() {
      try {
        const res = await fetch('/api/billing/checkout/prepare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planCode: DEFAULT_MONTHLY_PLAN_CODE }),
        });
        const data = (await res.json()) as PrepareResponse;

        if (!res.ok) {
          throw new Error(data.error ?? '결제 준비에 실패했습니다.');
        }

        if (!cancelled) {
          setPrepare(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : '결제 준비에 실패했습니다.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPrepare();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCheckout() {
    if (!prepare || !paidServiceAgreed) {
      return;
    }

    setSubmitting(true);
    setError(null);

    const successRedirectUrl = `${prepare.successUrl}?planCode=${encodeURIComponent(prepare.plan.code)}&paymentId=${encodeURIComponent(prepare.paymentId)}`;

    try {
      const issueResponse = await PortOne.requestIssueBillingKey({
        storeId: prepare.storeId,
        channelKey: prepare.channelKey,
        billingKeyMethod: 'CARD',
        customer: { customerId: prepare.customerKey },
        issueName: prepare.plan.name,
        displayAmount: prepare.nextBilling.billedAmount,
        currency: 'KRW',
        redirectUrl: successRedirectUrl,
      });

      if (!issueResponse?.billingKey) {
        if (issueResponse?.code) {
          throw new Error(issueResponse.message ?? '빌링키 발급에 실패했습니다.');
        }
        return;
      }

      await confirmBillingCheckout({
        billingKey: issueResponse.billingKey,
        planCode: prepare.plan.code,
        paymentId: prepare.paymentId,
      });

      router.replace('/dashboard/settings/billing');
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : '결제창 호출에 실패했습니다.'
      );
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-600">결제 정보를 불러오는 중...</p>;
  }

  if (error && !prepare) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!prepare) {
    return null;
  }

  const canCheckout = prepare.guardianConsentConfirmed && paidServiceAgreed;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">구독 결제</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          14일 무료 체험 중에도 카드 등록 없이 이용할 수 있습니다. 구독을 시작하면
          아래 요금이 결제되며, 이후 매월 자동 갱신됩니다.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
        <p className="text-sm font-medium text-gray-500">요금제</p>
        <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">
          {prepare.plan.name}
        </p>
        <div className="mt-4 space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <p>정가: {formatKrw(prepare.nextBilling.planPrice)}</p>
          {prepare.nextBilling.discountAmount - prepare.nextBilling.pointAmountUsed > 0 ? (
            <p>
              할인: -
              {formatKrw(
                prepare.nextBilling.discountAmount - prepare.nextBilling.pointAmountUsed
              )}
            </p>
          ) : null}
          {prepare.nextBilling.pointAmountUsed > 0 ? (
            <p>포인트: -{formatKrw(prepare.nextBilling.pointAmountUsed)}</p>
          ) : null}
          <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
            결제 예정액: {formatKrw(prepare.nextBilling.billedAmount)} /{' '}
            {formatBillingInterval(prepare.plan.interval)}
          </p>
        </div>
      </div>

      <BillingDisclosure />

      {!prepare.guardianConsentConfirmed ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          법정대리인 동의 정보가 확인되지 않아 결제를 진행할 수 없습니다. 가입 시
          동의 절차를 완료했는지 확인하거나 고객센터로 문의해 주세요.
        </div>
      ) : null}

      <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 text-sm dark:border-neutral-700">
        <input
          type="checkbox"
          checked={paidServiceAgreed}
          onChange={(event) => setPaidServiceAgreed(event.target.checked)}
          className="mt-0.5"
        />
        <span>
          <Link href="/legal/paid-service" className="text-blue-600 hover:underline">
            유료서비스 이용약관
          </Link>
          에 동의합니다. (자동갱신·해지 방법·체험 후 요금을 확인했습니다.)
        </span>
      </label>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.push('/dashboard/settings/billing')}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-neutral-700 dark:text-gray-200"
        >
          돌아가기
        </button>
        <button
          type="button"
          disabled={submitting || !canCheckout}
          onClick={handleCheckout}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {submitting ? '결제창 여는 중...' : '카드 등록 및 결제'}
        </button>
      </div>
    </div>
  );
}
