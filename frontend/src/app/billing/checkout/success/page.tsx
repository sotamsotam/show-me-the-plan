import { Suspense } from 'react';
import SiteFooter from '@/components/SiteFooter';
import BillingCheckoutSuccessClient from './BillingCheckoutSuccessClient';

export default function BillingCheckoutSuccessPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-gray-50">
      <Suspense
        fallback={
          <main className="flex flex-1 items-center justify-center px-4">
            <p className="text-sm text-gray-600">결제 확인 중...</p>
          </main>
        }
      >
        <BillingCheckoutSuccessClient />
      </Suspense>
      <SiteFooter />
    </div>
  );
}
