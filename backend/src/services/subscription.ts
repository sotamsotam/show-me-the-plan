import type { Core } from '@strapi/strapi';
import {
  isAccessAllowedStatus,
  resolveBillingAmount,
  type BillingBreakdown,
} from './billing';
import {
  DEFAULT_MONTHLY_PLAN_CODE,
  PLAN_UID,
  SUBSCRIPTION_UID,
  TRIAL_DAYS,
  type SubscriptionStatus,
} from './subscription-constants';
import { isAnyStudentSchoolLevel } from './school-level';

type SubscriptionRow = {
  id: number;
  documentId?: string;
  status: SubscriptionStatus;
  trialStartedAt?: string | Date | null;
  hasUsedTrial?: boolean | null;
  currentPeriodStart?: string | Date | null;
  currentPeriodEnd?: string | Date | null;
  cancelAtPeriodEnd?: boolean | null;
  canceledAt?: string | Date | null;
  pgProvider?: string | null;
  pgCustomerId?: string | null;
  pgBillingKey?: string | null;
  discountPercent?: number | null;
  discountFixedAmount?: number | null;
  overridePrice?: number | null;
  discountStartsAt?: string | Date | null;
  discountEndsAt?: string | Date | null;
  discountApplyOnce?: boolean | null;
  discountNote?: string | null;
  discountGrantedAt?: string | Date | null;
  discountGrantedBy?: string | null;
  plan?: {
    id: number;
    code?: string;
    name?: string;
    price?: number;
    interval?: string;
  } | null;
  user?: { id: number } | number | null;
};

type PlanRow = {
  id: number;
  code: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  active: boolean;
  targetSchoolLevels?: unknown;
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

  if (typeof user === 'number') {
    return user;
  }

  return user.id ?? null;
}

export async function getDefaultMonthlyPlan(
  strapi: Core.Strapi
): Promise<PlanRow | null> {
  return (await strapi.db.query(PLAN_UID).findOne({
    where: { code: DEFAULT_MONTHLY_PLAN_CODE, active: true },
  })) as PlanRow | null;
}

export async function seedDefaultPlans(strapi: Core.Strapi): Promise<void> {
  const existing = await strapi.db.query(PLAN_UID).findOne({
    where: { code: DEFAULT_MONTHLY_PLAN_CODE },
  });

  if (existing) {
    return;
  }

  await strapi.db.query(PLAN_UID).create({
    data: {
      code: DEFAULT_MONTHLY_PLAN_CODE,
      name: '학생 월간 구독',
      targetSchoolLevels: ['elementary', 'middle', 'high', 'other'],
      price: 4900,
      interval: 'month',
      active: true,
    },
  });
}

export async function getSubscriptionByUserId(
  strapi: Core.Strapi,
  userId: number
): Promise<SubscriptionRow | null> {
  return (await strapi.db.query(SUBSCRIPTION_UID).findOne({
    where: { user: userId },
    populate: ['plan'],
  })) as SubscriptionRow | null;
}

export async function isStudentUser(
  strapi: Core.Strapi,
  userId: number
): Promise<boolean> {
  const profile = (await strapi.db.query('api::user-profile.user-profile').findOne({
    where: { user: userId },
  })) as { schoolLevel?: string; isOperator?: boolean | null } | null;

  if (profile?.isOperator) {
    return false;
  }

  return isAnyStudentSchoolLevel(profile?.schoolLevel);
}

export function isPeriodActive(
  subscription: Pick<SubscriptionRow, 'currentPeriodEnd'>,
  now = new Date()
): boolean {
  const periodEnd = toDate(subscription.currentPeriodEnd);
  return periodEnd != null && periodEnd > now;
}

export async function syncSubscriptionExpiry(
  strapi: Core.Strapi,
  subscription: SubscriptionRow,
  now = new Date()
): Promise<SubscriptionRow> {
  if (!isPeriodActive(subscription, now) && subscription.status !== 'expired') {
    const updated = (await strapi.db.query(SUBSCRIPTION_UID).update({
      where: { id: subscription.id },
      data: { status: 'expired' },
      populate: ['plan'],
    })) as SubscriptionRow;

    return updated;
  }

  return subscription;
}

export async function hasActiveSubscription(
  strapi: Core.Strapi,
  userId: number,
  now = new Date()
): Promise<boolean> {
  const subscription = await getSubscriptionByUserId(strapi, userId);

  if (!subscription) {
    return false;
  }

  const synced = await syncSubscriptionExpiry(strapi, subscription, now);

  return (
    isAccessAllowedStatus(synced.status) && isPeriodActive(synced, now)
  );
}

export async function createTrialSubscription(
  strapi: Core.Strapi,
  userId: number,
  now = new Date()
): Promise<SubscriptionRow> {
  const periodEnd = new Date(now);
  periodEnd.setDate(periodEnd.getDate() + TRIAL_DAYS);

  return (await strapi.db.query(SUBSCRIPTION_UID).create({
    data: {
      user: userId,
      status: 'trialing',
      trialStartedAt: now,
      hasUsedTrial: true,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      pgProvider: 'toss',
      cancelAtPeriodEnd: false,
    },
    populate: ['plan'],
  })) as SubscriptionRow;
}

export async function resolvePlanForSubscription(
  strapi: Core.Strapi,
  subscription: SubscriptionRow
): Promise<PlanRow | null> {
  if (subscription.plan?.price != null && subscription.plan.code) {
    return subscription.plan as PlanRow;
  }

  return getDefaultMonthlyPlan(strapi);
}

export async function resolveNextBillingBreakdown(
  strapi: Core.Strapi,
  subscription: SubscriptionRow,
  now = new Date()
): Promise<BillingBreakdown | null> {
  const plan = await resolvePlanForSubscription(strapi, subscription);

  if (!plan) {
    return null;
  }

  return resolveBillingAmount(plan.price, subscription, now);
}

export type SubscriptionSummary = {
  status: SubscriptionStatus;
  isAccessAllowed: boolean;
  trialStartedAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasBillingKey: boolean;
  plan: {
    code: string;
    name: string;
    price: number;
    interval: string;
  } | null;
  nextBilling: BillingBreakdown | null;
};

export async function getSubscriptionSummaryForUser(
  strapi: Core.Strapi,
  userId: number,
  now = new Date()
): Promise<SubscriptionSummary | null> {
  if (!(await isStudentUser(strapi, userId))) {
    return null;
  }

  let subscription = await getSubscriptionByUserId(strapi, userId);

  if (!subscription) {
    return null;
  }

  subscription = await syncSubscriptionExpiry(strapi, subscription, now);
  const plan = await resolvePlanForSubscription(strapi, subscription);
  const nextBilling = plan
    ? resolveBillingAmount(plan.price, subscription, now)
    : null;

  const isAccessAllowed =
    isAccessAllowedStatus(subscription.status) &&
    isPeriodActive(subscription, now);

  return {
    status: subscription.status,
    isAccessAllowed,
    trialStartedAt: toDate(subscription.trialStartedAt)?.toISOString() ?? null,
    currentPeriodStart:
      toDate(subscription.currentPeriodStart)?.toISOString() ?? null,
    currentPeriodEnd:
      toDate(subscription.currentPeriodEnd)?.toISOString() ?? null,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd ?? false,
    hasBillingKey: Boolean(subscription.pgBillingKey),
    plan: plan
      ? {
          code: plan.code,
          name: plan.name,
          price: plan.price,
          interval: plan.interval,
        }
      : null,
    nextBilling,
  };
}

export async function backfillMissingStudentSubscriptions(
  strapi: Core.Strapi
): Promise<number> {
  const profiles = (await strapi.db.query('api::user-profile.user-profile').findMany({
    where: {
      schoolLevel: { $in: ['elementary', 'middle', 'high', 'other'] },
      $or: [{ isOperator: false }, { isOperator: null }],
    },
    populate: ['user'],
  })) as Array<{ user?: { id: number } | number | null }>;

  let created = 0;

  for (const profile of profiles) {
    const userId =
      typeof profile.user === 'number' ? profile.user : profile.user?.id;

    if (!userId) {
      continue;
    }

    const existing = await getSubscriptionByUserId(strapi, userId);

    if (existing) {
      continue;
    }

    await createTrialSubscription(strapi, userId);
    created += 1;
  }

  return created;
}

export async function expireDueSubscriptions(
  strapi: Core.Strapi,
  now = new Date()
): Promise<number> {
  const dueRows = (await strapi.db.query(SUBSCRIPTION_UID).findMany({
    where: {
      status: { $in: ['trialing', 'active', 'past_due', 'canceled'] },
      currentPeriodEnd: { $lt: now.toISOString() },
    },
  })) as SubscriptionRow[];

  let updated = 0;

  for (const row of dueRows) {
    await strapi.db.query(SUBSCRIPTION_UID).update({
      where: { id: row.id },
      data: { status: 'expired' },
    });
    updated += 1;
  }

  return updated;
}

/** QA/CS: force subscription expired (local & staging scripts only). */
export async function expireSubscriptionForQa(
  strapi: Core.Strapi,
  userId: number
): Promise<boolean> {
  if (!(await isStudentUser(strapi, userId))) {
    return false;
  }

  const subscription = await getSubscriptionByUserId(strapi, userId);

  if (!subscription) {
    return false;
  }

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  await strapi.db.query(SUBSCRIPTION_UID).update({
    where: { id: subscription.id },
    data: {
      status: 'expired',
      currentPeriodEnd: yesterday,
    },
  });

  return true;
}

export async function clearDiscountAfterOneTimeUse(
  strapi: Core.Strapi,
  subscriptionId: number
): Promise<void> {
  await strapi.db.query(SUBSCRIPTION_UID).update({
    where: { id: subscriptionId },
    data: {
      discountPercent: null,
      discountFixedAmount: null,
      overridePrice: null,
      discountStartsAt: null,
      discountEndsAt: null,
      discountApplyOnce: false,
    },
  });
}

export { resolveUserId };
