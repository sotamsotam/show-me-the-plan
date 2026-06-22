import { Suspense } from 'react';
import BillingCheckoutFailClient from './BillingCheckoutFailClient';

export default function BillingCheckoutFailPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center bg-gray-50 px-4">
          <p className="text-sm text-gray-600">결제 결과 확인 중...</p>
        </main>
      }
    >
      <BillingCheckoutFailClient />
    </Suspense>
  );
}
