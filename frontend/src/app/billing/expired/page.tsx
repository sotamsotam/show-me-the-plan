import BillingExpiredClient from './BillingExpiredClient';

export const metadata = {
  title: '구독 만료 — Show Me The Plan',
};

export default function BillingExpiredPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gray-50 px-4 py-10 dark:bg-zinc-950">
      <BillingExpiredClient />
    </main>
  );
}
