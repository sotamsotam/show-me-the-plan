import type { Core } from '@strapi/strapi';
import {
  buildDiscountSnapshot,
  resolveBillingAmount,
  type BillingBreakdown,
} from './billing';
import { decryptBillingSecret, encryptBillingSecret } from './billing-crypto';
import {
  clearDiscountAfterOneTimeUse,
  getSubscriptionByUserId,
  resolvePlanForSubscription,
} from './subscription';
import {
  DEFAULT_MONTHLY_PLAN_CODE,
  PAYMENT_HISTORY_UID,
  PLAN_UID,
  SUBSCRIPTION_UID,
  type SubscriptionStatus,
} from './subscription-constants';

type PlanRow = {
  id: number;
  code: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
};

type SubscriptionRow = {
  id: number;
  status: SubscriptionStatus;
  currentPeriodStart?: string | Date | null;
  currentPeriodEnd?: string | Date | null;
  cancelAtPeriodEnd?: boolean | null;
  pgBillingKey?: string | null;
  pgCustomerId?: string | null;
  discountApplyOnce?: boolean | null;
  discountPercent?: number | null;
  discountFixedAmount?: number | null;
  overridePrice?: number | null;
  discountStartsAt?: string | Date | null;
  discountEndsAt?: string | Date | null;
  plan?: PlanRow | null;
  user?: { id: number } | number | null;
};

export type PaymentSuccessInput = {
  userId: number;
  planCode: string;
  pgPaymentId: string;
  planPrice: number;
  discountAmount: number;
  amount: number;
  receiptUrl?: string | null;
  pgBillingKey?: string | null;
  pgCustomerId?: string | null;
  paidAt?: string | Date | null;
};

export type RenewalCandidate = {
  userId: number;
  subscriptionId: number;
  planCode: string;
  customerKey: string;
  billingKey: string;
  breakdown: BillingBreakdown;
  orderName: string;
};

function toDate(value: string | Date | null | undefined): Date | null {
  if (value == null) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function resolveUserId(user: SubscriptionRow['user']): number | null {
  if (user == null) {
    return null;
  }

  return typeof user === 'number' ? user : user.id ?? null;
}

export function addPlanInterval(date: Date, interval: 'month' | 'year'): Date {
  const next = new Date(date);

  if (interval === 'year') {
    next.setFullYear(next.getFullYear() + 1);
    return next;
  }

  next.setMonth(next.getMonth() + 1);
  return next;
}

export async function getPlanByCode(
  strapi: Core.Strapi,
  planCode: string
): Promise<PlanRow | null> {
  return (await strapi.db.query(PLAN_UID).findOne({
    where: { code: planCode, active: true },
  })) as PlanRow | null;
}

export async function getPaymentHistoryForUser(
  strapi: Core.Strapi,
  userId: number
) {
  const subscription = await getSubscriptionByUserId(strapi, userId);

  if (!subscription) {
    return [];
  }

  const rows = await strapi.db.query(PAYMENT_HISTORY_UID).findMany({
    where: { subscription: subscription.id },
    orderBy: { paidAt: 'desc' },
  });

  return rows.map((row) => ({
    id: row.id,
    planPrice: row.planPrice,
    discountAmount: row.discountAmount,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    pgPaymentId: row.pgPaymentId,
    paidAt: row.paidAt,
    receiptUrl: row.receiptUrl,
  }));
}

export async function saveBillingKey(
  strapi: Core.Strapi,
  userId: number,
  planCode: string,
  billingKey: string,
  customerKey: string
): Promise<SubscriptionRow | null> {
  const subscription = await getSubscriptionByUserId(strapi, userId);
  const plan = await getPlanByCode(strapi, planCode);

  if (!subscription || !plan) {
    return null;
  }

  return (await strapi.db.query(SUBSCRIPTION_UID).update({
    where: { id: subscription.id },
    data: {
      plan: plan.id,
      pgProvider: 'toss',
      pgBillingKey: encryptBillingSecret(billingKey),
      pgCustomerId: customerKey,
    },
    populate: ['plan'],
  })) as SubscriptionRow;
}

async function createPaymentHistory(
  strapi: Core.Strapi,
  subscription: { id: number },
  input: PaymentSuccessInput,
  discountSnapshot: Record<string, unknown>
) {
  const existing = await strapi.db.query(PAYMENT_HISTORY_UID).findOne({
    where: { pgPaymentId: input.pgPaymentId },
  });

  if (existing) {
    return existing;
  }

  return strapi.db.query(PAYMENT_HISTORY_UID).create({
    data: {
      subscription: subscription.id,
      planPrice: input.planPrice,
      discountAmount: input.discountAmount,
      amount: input.amount,
      currency: 'KRW',
      status: 'succeeded',
      pgPaymentId: input.pgPaymentId,
      paidAt: input.paidAt ?? new Date(),
      receiptUrl: input.receiptUrl ?? null,
      discountSnapshot,
    },
  });
}

export async function applyPaymentSuccess(
  strapi: Core.Strapi,
  input: PaymentSuccessInput,
  now = new Date()
): Promise<SubscriptionRow | null> {
  const subscription = await getSubscriptionByUserId(strapi, input.userId);
  const plan = await getPlanByCode(strapi, input.planCode);

  if (!subscription || !plan) {
    return null;
  }

  const periodStart = now;
  const periodEnd = addPlanInterval(now, plan.interval);
  const discountSnapshot = buildDiscountSnapshot(subscription);

  await createPaymentHistory(strapi, subscription, input, discountSnapshot);

  const updated = (await strapi.db.query(SUBSCRIPTION_UID).update({
    where: { id: subscription.id },
    data: {
      plan: plan.id,
      status: 'active',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      ...(input.pgBillingKey
        ? {
            pgBillingKey: encryptBillingSecret(input.pgBillingKey),
            pgProvider: 'toss',
          }
        : {}),
      ...(input.pgCustomerId ? { pgCustomerId: input.pgCustomerId } : {}),
    },
    populate: ['plan'],
  })) as SubscriptionRow;

  if (subscription.discountApplyOnce) {
    await clearDiscountAfterOneTimeUse(strapi, subscription.id);
  }

  return updated;
}

export async function applyFreePeriodGrant(
  strapi: Core.Strapi,
  userId: number,
  planCode: string,
  now = new Date()
): Promise<SubscriptionRow | null> {
  const subscription = await getSubscriptionByUserId(strapi, userId);
  const plan = await getPlanByCode(strapi, planCode);

  if (!subscription || !plan) {
    return null;
  }

  const breakdown = resolveBillingAmount(plan.price, subscription, now);

  if (!breakdown.skipPgCharge) {
    return null;
  }

  const fakePaymentId = `free-${userId}-${now.getTime()}`;

  return applyPaymentSuccess(strapi, {
    userId,
    planCode,
    pgPaymentId: fakePaymentId,
    planPrice: breakdown.planPrice,
    discountAmount: breakdown.discountAmount,
    amount: 0,
    paidAt: now,
  }, now);
}

export async function applyPaymentFailure(
  strapi: Core.Strapi,
  userId: number,
  pgPaymentId?: string | null
): Promise<SubscriptionRow | null> {
  const subscription = await getSubscriptionByUserId(strapi, userId);

  if (!subscription) {
    return null;
  }

  if (pgPaymentId) {
    const existing = await strapi.db.query(PAYMENT_HISTORY_UID).findOne({
      where: { pgPaymentId },
    });

    if (!existing) {
      const plan = await resolvePlanForSubscription(strapi, subscription);
      const breakdown = plan
        ? resolveBillingAmount(plan.price, subscription)
        : {
            planPrice: 0,
            discountAmount: 0,
            billedAmount: 0,
            skipPgCharge: true,
          };

      await strapi.db.query(PAYMENT_HISTORY_UID).create({
        data: {
          subscription: subscription.id,
          planPrice: breakdown.planPrice,
          discountAmount: breakdown.discountAmount,
          amount: breakdown.billedAmount,
          currency: 'KRW',
          status: 'failed',
          pgPaymentId,
          paidAt: new Date(),
          discountSnapshot: buildDiscountSnapshot(subscription),
        },
      });
    }
  }

  return (await strapi.db.query(SUBSCRIPTION_UID).update({
    where: { id: subscription.id },
    data: { status: 'past_due' },
    populate: ['plan'],
  })) as SubscriptionRow;
}

export async function cancelSubscriptionAtPeriodEnd(
  strapi: Core.Strapi,
  userId: number,
  now = new Date()
): Promise<SubscriptionRow | null> {
  const subscription = await getSubscriptionByUserId(strapi, userId);

  if (!subscription) {
    return null;
  }

  return (await strapi.db.query(SUBSCRIPTION_UID).update({
    where: { id: subscription.id },
    data: {
      cancelAtPeriodEnd: true,
      canceledAt: now,
    },
    populate: ['plan'],
  })) as SubscriptionRow;
}

export async function listRenewalCandidates(
  strapi: Core.Strapi,
  now = new Date()
): Promise<RenewalCandidate[]> {
  const rows = (await strapi.db.query(SUBSCRIPTION_UID).findMany({
    where: {
      status: { $in: ['trialing', 'active', 'past_due'] },
      cancelAtPeriodEnd: false,
      currentPeriodEnd: { $lte: now.toISOString() },
      pgBillingKey: { $notNull: true },
    },
    populate: ['plan', 'user'],
  })) as SubscriptionRow[];

  const candidates: RenewalCandidate[] = [];

  for (const row of rows) {
    const userId = resolveUserId(row.user);

    if (!userId || !row.pgBillingKey) {
      continue;
    }

    const plan = await resolvePlanForSubscription(strapi, row);
    const customerKey = row.pgCustomerId ?? `student-${userId}`;

    if (!plan) {
      continue;
    }

    const breakdown = resolveBillingAmount(plan.price, row, now);

    candidates.push({
      userId,
      subscriptionId: row.id,
      planCode: plan.code,
      customerKey,
      billingKey: decryptBillingSecret(row.pgBillingKey),
      breakdown,
      orderName: plan.name,
    });
  }

  return candidates;
}

export async function resolveCheckoutBreakdown(
  strapi: Core.Strapi,
  userId: number,
  planCode: string,
  now = new Date()
): Promise<{ plan: PlanRow; breakdown: BillingBreakdown } | null> {
  const subscription = await getSubscriptionByUserId(strapi, userId);
  const plan = await getPlanByCode(strapi, planCode);

  if (!subscription || !plan) {
    return null;
  }

  return {
    plan,
    breakdown: resolveBillingAmount(plan.price, subscription, now),
  };
}

export function buildCustomerKey(userId: number): string {
  return `student-${userId}`;
}

export { DEFAULT_MONTHLY_PLAN_CODE };
