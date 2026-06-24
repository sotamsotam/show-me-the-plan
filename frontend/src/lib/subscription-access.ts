import type { SubscriptionSummary } from '@/types/subscription';

export type SubscriptionSessionPayload = {
  status: SubscriptionSummary['status'];
  isAccessAllowed: boolean;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  nextBillingAmount: number | null;
};

export function buildSubscriptionSession(
  subscription: SubscriptionSummary | null | undefined
): SubscriptionSessionPayload | null {
  if (!subscription) {
    return null;
  }

  return {
    status: subscription.status,
    isAccessAllowed: subscription.isAccessAllowed,
    currentPeriodEnd: subscription.currentPeriodEnd,
    trialEndsAt:
      subscription.status === 'trialing' ? subscription.currentPeriodEnd : null,
    nextBillingAmount: subscription.nextBilling?.billedAmount ?? null,
  };
}

export function getTrialDaysRemaining(
  subscription: Pick<SubscriptionSummary, 'status' | 'currentPeriodEnd'> | null | undefined
): number | null {
  if (!subscription || subscription.status !== 'trialing' || !subscription.currentPeriodEnd) {
    return null;
  }

  const end = new Date(subscription.currentPeriodEnd);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return Math.max(0, days);
}

export const DASHBOARD_ALLOWED_WHEN_EXPIRED = [
  '/dashboard/settings/billing',
] as const;

export const BILLING_ALLOWED_WHEN_EXPIRED = [
  '/billing/expired',
  '/billing/checkout',
] as const;

export const API_ALLOWED_WHEN_EXPIRED = [
  '/api/auth',
  '/api/register',
  '/api/billing',
  '/api/subscription/me',
  '/api/subscription/use-points',
  '/api/neis',
] as const;

export function isDashboardBillingAllowed(pathname: string): boolean {
  return DASHBOARD_ALLOWED_WHEN_EXPIRED.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

export function isBillingPathAllowedWhenExpired(pathname: string): boolean {
  return BILLING_ALLOWED_WHEN_EXPIRED.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

export function isApiAllowedWhenExpired(pathname: string): boolean {
  return API_ALLOWED_WHEN_EXPIRED.some((prefix) => pathname.startsWith(prefix));
}

export function isPublicApiPath(pathname: string): boolean {
  if (pathname.startsWith('/api/auth')) return true;
  if (pathname.startsWith('/api/register')) return true;
  if (pathname === '/api/billing/plans') return true;
  if (pathname === '/api/billing/health') return true;
  if (pathname.startsWith('/api/billing/webhooks/')) return true;
  if (pathname.startsWith('/api/billing/cron/')) return true;
  if (pathname.startsWith('/api/neis')) return true;
  if (pathname === '/api/user-reviews') return true;
  if (pathname === '/api/user-reviews/home-featured') return true;
  return false;
}
