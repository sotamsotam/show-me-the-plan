import BillingCheckoutClient from './BillingCheckoutClient';
import SiteFooter from '@/components/SiteFooter';

export default function BillingCheckoutPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-gray-50">
      <main className="flex-1 px-4 py-10">
        <BillingCheckoutClient />
      </main>
      <SiteFooter />
    </div>
  );
}
