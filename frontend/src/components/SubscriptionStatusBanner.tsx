import Link from 'next/link';
import { getTrialDaysRemaining } from '@/lib/subscription-access';
import type { SubscriptionSummary } from '@/types/subscription';

interface SubscriptionStatusBannerProps {
  subscription: SubscriptionSummary | null | undefined;
}

export default function SubscriptionStatusBanner({
  subscription,
}: SubscriptionStatusBannerProps) {
  if (!subscription?.isAccessAllowed || subscription.status !== 'trialing') {
    return null;
  }

  const daysRemaining = getTrialDaysRemaining(subscription);

  if (daysRemaining === null) {
    return null;
  }

  const urgencyClass =
    daysRemaining <= 3
      ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100'
      : 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100';

  const message =
    daysRemaining === 0
      ? '무료 체험이 오늘 종료됩니다. 구독하면 모든 기능을 계속 이용할 수 있습니다.'
      : `무료 체험이 ${daysRemaining}일 남았습니다. 체험 종료 후에도 이용하려면 구독이 필요합니다.`;

  return (
    <div
      className={`mb-4 flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${urgencyClass}`}
      role="status"
    >
      <p className="text-sm font-medium">{message}</p>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Link
          href="/billing/checkout"
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          구독하기
        </Link>
        <Link
          href="/dashboard/settings/billing"
          className="rounded-lg border border-current px-3 py-1.5 text-sm font-medium hover:opacity-80"
        >
          구독 관리
        </Link>
      </div>
    </div>
  );
}
