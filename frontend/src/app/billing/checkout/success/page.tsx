import { Suspense } from 'react';
import BillingCheckoutSuccessClient from './BillingCheckoutSuccessClient';

export default function BillingCheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center bg-gray-50 px-4">
          <p className="text-sm text-gray-600">결제 확인 중...</p>
        </main>
      }
    >
      <BillingCheckoutSuccessClient />
    </Suspense>
  );
}
