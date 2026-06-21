import type { SubscriptionStatus } from './subscription-constants';

export type SubscriptionDiscountFields = {
  discountPercent?: number | null;
  discountFixedAmount?: number | null;
  overridePrice?: number | null;
  discountStartsAt?: Date | string | null;
  discountEndsAt?: Date | string | null;
};

export type BillingBreakdown = {
  planPrice: number;
  discountAmount: number;
  billedAmount: number;
  skipPgCharge: boolean;
};

export type DiscountSnapshot = {
  discountPercent?: number | null;
  discountFixedAmount?: number | null;
  overridePrice?: number | null;
  discountApplyOnce?: boolean | null;
};

function toDate(value: Date | string | null | undefined): Date | null {
  if (value == null) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isDiscountActive(
  subscription: SubscriptionDiscountFields,
  now: Date
): boolean {
  const startsAt = toDate(subscription.discountStartsAt);
  const endsAt = toDate(subscription.discountEndsAt);

  if (startsAt && now < startsAt) {
    return false;
  }

  if (endsAt && now > endsAt) {
    return false;
  }

  return true;
}

export function resolveBillingAmount(
  planPrice: number,
  subscription: SubscriptionDiscountFields,
  now = new Date()
): BillingBreakdown {
  const normalizedPlanPrice = Math.max(0, Math.round(planPrice));

  if (!isDiscountActive(subscription, now)) {
    return {
      planPrice: normalizedPlanPrice,
      discountAmount: 0,
      billedAmount: normalizedPlanPrice,
      skipPgCharge: normalizedPlanPrice === 0,
    };
  }

  if (subscription.overridePrice != null) {
    const billedAmount = Math.max(0, Math.round(subscription.overridePrice));
    return {
      planPrice: normalizedPlanPrice,
      discountAmount: normalizedPlanPrice - billedAmount,
      billedAmount,
      skipPgCharge: billedAmount === 0,
    };
  }

  let billedAmount = normalizedPlanPrice;

  if (subscription.discountPercent != null && subscription.discountPercent > 0) {
    billedAmount = Math.round(billedAmount * (1 - subscription.discountPercent / 100));
  }

  if (subscription.discountFixedAmount != null && subscription.discountFixedAmount > 0) {
    billedAmount = Math.max(0, billedAmount - Math.round(subscription.discountFixedAmount));
  }

  return {
    planPrice: normalizedPlanPrice,
    discountAmount: normalizedPlanPrice - billedAmount,
    billedAmount,
    skipPgCharge: billedAmount === 0,
  };
}

export function buildDiscountSnapshot(
  subscription: SubscriptionDiscountFields & { discountApplyOnce?: boolean | null }
): DiscountSnapshot {
  return {
    discountPercent: subscription.discountPercent ?? null,
    discountFixedAmount: subscription.discountFixedAmount ?? null,
    overridePrice: subscription.overridePrice ?? null,
    discountApplyOnce: subscription.discountApplyOnce ?? null,
  };
}

export function isAccessAllowedStatus(status: SubscriptionStatus): boolean {
  return status === 'trialing' || status === 'active';
}
