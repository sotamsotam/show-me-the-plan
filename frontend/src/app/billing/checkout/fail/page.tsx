import { Suspense } from 'react';
import SiteFooter from '@/components/SiteFooter';
import BillingCheckoutFailClient from './BillingCheckoutFailClient';

export default function BillingCheckoutFailPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-gray-50">
      <Suspense
        fallback={
          <main className="flex flex-1 items-center justify-center px-4">
            <p className="text-sm text-gray-600">결제 결과 확인 중...</p>
          </main>
        }
      >
        <BillingCheckoutFailClient />
      </Suspense>
      <SiteFooter />
    </div>
  );
}
