import { describe, expect, it } from 'vitest';
import {
  buildSubscriptionSession,
  getTrialDaysRemaining,
  isApiAllowedWhenExpired,
  isDashboardBillingAllowed,
} from './subscription-access';

describe('buildSubscriptionSession', () => {
  it('maps trialing subscription with trial end date', () => {
    const session = buildSubscriptionSession({
      status: 'trialing',
      isAccessAllowed: true,
      trialStartedAt: '2026-01-01T00:00:00.000Z',
      currentPeriodStart: '2026-01-01T00:00:00.000Z',
      currentPeriodEnd: '2026-01-15T00:00:00.000Z',
      cancelAtPeriodEnd: false,
      hasBillingKey: false,
      plan: null,
      nextBilling: { planPrice: 4900, discountAmount: 0, pointAmountUsed: 0, billedAmount: 4900, skipPgCharge: false },
    });

    expect(session).toMatchObject({
      status: 'trialing',
      isAccessAllowed: true,
      trialEndsAt: '2026-01-15T00:00:00.000Z',
      nextBillingAmount: 4900,
    });
  });
});

describe('getTrialDaysRemaining', () => {
  it('returns null for non-trialing status', () => {
    expect(
      getTrialDaysRemaining({ status: 'active', currentPeriodEnd: '2026-02-01T00:00:00.000Z' })
    ).toBeNull();
  });

  it('returns days remaining for trialing subscription', () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    const days = getTrialDaysRemaining({
      status: 'trialing',
      currentPeriodEnd: future.toISOString(),
    });
    expect(days).toBeGreaterThan(0);
    expect(days).toBeLessThanOrEqual(5);
  });
});

describe('access path helpers', () => {
  it('allows billing settings when expired', () => {
    expect(isDashboardBillingAllowed('/dashboard/settings/billing')).toBe(true);
    expect(isDashboardBillingAllowed('/dashboard/settings')).toBe(false);
  });

  it('allows billing API when expired', () => {
    expect(isApiAllowedWhenExpired('/api/billing/checkout/prepare')).toBe(true);
    expect(isApiAllowedWhenExpired('/api/subscription/use-points')).toBe(true);
    expect(isApiAllowedWhenExpired('/api/user-schedules')).toBe(false);
  });
});
