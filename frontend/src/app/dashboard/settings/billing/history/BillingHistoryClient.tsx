'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import PaymentHistoryTable, {
  type PaymentHistoryRow,
} from '@/components/billing/PaymentHistoryTable';

export default function BillingHistoryClient() {
  const [payments, setPayments] = useState<PaymentHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/billing/history');
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error ?? '결제 내역 조회에 실패했습니다.');
        }

        if (!cancelled) {
          setPayments(data.payments ?? []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : '결제 내역을 불러오지 못했습니다.'
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

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12 pt-12">
      <div>
        <Link
          href="/dashboard/settings/billing"
          className="text-sm text-blue-300 hover:text-blue-200 hover:underline"
        >
          ← 구독 · 결제로 돌아가기
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-white">결제 내역</h1>
        <p className="mt-2 text-sm text-gray-300">
          정가, 할인, 실결제액을 구분하여 확인할 수 있습니다.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-zinc-900">
        {loading ? (
          <p className="text-sm text-gray-600">불러오는 중...</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <PaymentHistoryTable payments={payments} />
        )}
      </div>
    </div>
  );
}
