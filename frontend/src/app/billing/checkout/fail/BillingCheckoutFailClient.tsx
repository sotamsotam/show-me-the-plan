'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function BillingCheckoutFailClient() {
  const searchParams = useSearchParams();
  const message =
    searchParams.get('message') ??
    searchParams.get('pgMessage') ??
    '카드 등록 또는 결제가 완료되지 않았습니다.';

  return (
    <main className="flex min-h-dvh items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">결제가 취소되었습니다</h1>
        <p className="mt-3 text-sm text-gray-600">{message}</p>
        <Link
          href="/billing/checkout"
          className="mt-6 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          다시 시도
        </Link>
      </div>
    </main>
  );
}
