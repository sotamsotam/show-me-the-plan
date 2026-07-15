import BillingExpiredClient from './BillingExpiredClient';
import SiteFooter from '@/components/SiteFooter';

export const metadata = {
  title: '구독 만료 — Show Me The Plan',
};

export default function BillingExpiredPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-gray-50 dark:bg-zinc-950">
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <BillingExpiredClient />
      </main>
      <SiteFooter />
    </div>
  );
}
