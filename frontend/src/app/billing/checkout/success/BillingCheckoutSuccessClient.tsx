'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DEFAULT_MONTHLY_PLAN_CODE } from '@/types/subscription';

export default function BillingCheckoutSuccessClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const authKey = searchParams.get('authKey');
    const planCode = searchParams.get('planCode') ?? DEFAULT_MONTHLY_PLAN_CODE;

    if (!authKey) {
      setError('인증 정보가 없습니다.');
      return;
    }

    let cancelled = false;

    async function confirm() {
      try {
        const res = await fetch('/api/billing/billing-key/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ authKey, planCode }),
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error ?? '결제 확인에 실패했습니다.');
        }

        if (!cancelled) {
          setDone(true);
          setTimeout(() => {
            router.replace('/dashboard/settings/billing');
          }, 1500);
        }
      } catch (confirmError) {
        if (!cancelled) {
          setError(
            confirmError instanceof Error
              ? confirmError.message
              : '결제 확인에 실패했습니다.'
          );
        }
      }
    }

    confirm();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
        {error ? (
          <>
            <h1 className="text-xl font-semibold text-red-700">결제 처리 실패</h1>
            <p className="mt-3 text-sm text-gray-600">{error}</p>
            <Link
              href="/billing/checkout"
              className="mt-6 inline-block text-sm text-blue-600 underline"
            >
              다시 시도
            </Link>
          </>
        ) : done ? (
          <>
            <h1 className="text-xl font-semibold text-gray-900">결제가 완료되었습니다</h1>
            <p className="mt-3 text-sm text-gray-600">구독 관리 화면으로 이동합니다.</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-gray-900">결제 확인 중</h1>
            <p className="mt-3 text-sm text-gray-600">잠시만 기다려 주세요.</p>
          </>
        )}
      </div>
    </main>
  );
}
