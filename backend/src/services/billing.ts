import type { SubscriptionStatus } from './subscription-constants';

export type SubscriptionDiscountFields = {
  discountPercent?: number | null;
  discountFixedAmount?: number | null;
  overridePrice?: number | null;
  discountStartsAt?: Date | string | null;
  discountEndsAt?: Date | string | null;
};

export type SubscriptionPointFields = {
  pointBalance?: number | null;
  usePointsOnNextBilling?: boolean | null;
};

export type BillingBreakdown = {
  planPrice: number;
  discountAmount: number;
  pointAmountUsed: number;
  billedAmount: number;
  skipPgCharge: boolean;
};

export type DiscountSnapshot = {
  discountPercent?: number | null;
  discountFixedAmount?: number | null;
  overridePrice?: number | null;
  discountApplyOnce?: boolean | null;
  pointAmountUsed?: number | null;
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

function resolveAmountAfterDiscount(
  planPrice: number,
  subscription: SubscriptionDiscountFields,
  now: Date
): number {
  if (!isDiscountActive(subscription, now)) {
    return planPrice;
  }

  if (subscription.overridePrice != null) {
    return Math.max(0, Math.round(subscription.overridePrice));
  }

  let billedAmount = planPrice;

  if (subscription.discountPercent != null && subscription.discountPercent > 0) {
    billedAmount = Math.round(billedAmount * (1 - subscription.discountPercent / 100));
  }

  if (subscription.discountFixedAmount != null && subscription.discountFixedAmount > 0) {
    billedAmount = Math.max(0, billedAmount - Math.round(subscription.discountFixedAmount));
  }

  return billedAmount;
}

function applyPointDiscount(
  planPrice: number,
  amountAfterDiscount: number,
  subscription: SubscriptionPointFields,
  applyPoints: boolean
): BillingBreakdown {
  const pointBalance = Math.max(0, Math.round(subscription.pointBalance ?? 0));
  const shouldUsePoints =
    applyPoints && subscription.usePointsOnNextBilling === true && pointBalance > 0;

  let pointAmountUsed = 0;
  let billedAmount = amountAfterDiscount;

  if (shouldUsePoints && billedAmount > 0) {
    pointAmountUsed = Math.min(pointBalance, billedAmount);
    billedAmount -= pointAmountUsed;
  }

  return {
    planPrice,
    discountAmount: planPrice - billedAmount,
    pointAmountUsed,
    billedAmount,
    skipPgCharge: billedAmount === 0,
  };
}

export function resolveBillingAmount(
  planPrice: number,
  subscription: SubscriptionDiscountFields & SubscriptionPointFields,
  now = new Date(),
  options?: { applyPoints?: boolean }
): BillingBreakdown {
  const normalizedPlanPrice = Math.max(0, Math.round(planPrice));
  const applyPoints = options?.applyPoints !== false;
  const amountAfterDiscount = resolveAmountAfterDiscount(
    normalizedPlanPrice,
    subscription,
    now
  );

  return applyPointDiscount(
    normalizedPlanPrice,
    amountAfterDiscount,
    subscription,
    applyPoints
  );
}

export function buildDiscountSnapshot(
  subscription: SubscriptionDiscountFields & {
    discountApplyOnce?: boolean | null;
  },
  pointAmountUsed = 0
): DiscountSnapshot {
  return {
    discountPercent: subscription.discountPercent ?? null,
    discountFixedAmount: subscription.discountFixedAmount ?? null,
    overridePrice: subscription.overridePrice ?? null,
    discountApplyOnce: subscription.discountApplyOnce ?? null,
    pointAmountUsed: pointAmountUsed > 0 ? pointAmountUsed : null,
  };
}

export function isAccessAllowedStatus(status: SubscriptionStatus): boolean {
  return status === 'trialing' || status === 'active';
}
