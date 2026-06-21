import type { Core } from '@strapi/strapi';
import { resolveBillingAmount } from './billing';
import { isAnyStudentSchoolLevel } from './school-level';
import {
  getSubscriptionByUserId,
  getSubscriptionSummaryForUser,
  resolveNextBillingBreakdown,
  resolvePlanForSubscription,
  syncSubscriptionExpiry,
  type SubscriptionSummary,
} from './subscription';
import { SUBSCRIPTION_UID } from './subscription-constants';

const USER_PROFILE_UID = 'api::user-profile.user-profile';
const USER_UID = 'plugin::users-permissions.user';
const PAYMENT_HISTORY_UID = 'api::payment-history.payment-history';
const ASSIGNMENT_UID = 'api::student-manager-assignment.student-manager-assignment';

type ProfileRow = {
  id: number;
  schoolLevel?: string | null;
  managerStatus?: string | null;
  isOperator?: boolean | null;
  user?: { id: number; username?: string; email?: string } | number | null;
};

type SubscriptionRow = {
  id: number;
  status: string;
  currentPeriodEnd?: string | Date | null;
  cancelAtPeriodEnd?: boolean | null;
  discountPercent?: number | null;
  discountFixedAmount?: number | null;
  overridePrice?: number | null;
  user?: { id: number; username?: string; email?: string } | number | null;
};

function resolveUserId(user: ProfileRow['user']): number | null {
  if (user == null) {
    return null;
  }

  return typeof user === 'number' ? user : (user.id ?? null);
}

function toIso(value: string | Date | null | undefined): string | null {
  if (value == null) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isPeriodActive(
  currentPeriodEnd: string | Date | null | undefined,
  now: Date
): boolean {
  if (currentPeriodEnd == null) {
    return false;
  }

  const end = currentPeriodEnd instanceof Date ? currentPeriodEnd : new Date(currentPeriodEnd);
  return !Number.isNaN(end.getTime()) && end > now;
}

export async function getOpsDashboardSummary(strapi: Core.Strapi) {
  const profiles = (await strapi.db.query(USER_PROFILE_UID).findMany()) as ProfileRow[];

  let students = 0;
  let managers = 0;
  let operators = 0;

  for (const profile of profiles) {
    if (profile.isOperator) {
      operators += 1;
      continue;
    }

    if (profile.schoolLevel === 'manager') {
      managers += 1;
    } else if (isAnyStudentSchoolLevel(profile.schoolLevel)) {
      students += 1;
    }
  }

  const subscriptions = (await strapi.db.query(SUBSCRIPTION_UID).findMany()) as SubscriptionRow[];
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const byStatus: Record<string, number> = {
    trialing: 0,
    active: 0,
    past_due: 0,
    expired: 0,
    canceled: 0,
  };

  let cancelAtPeriodEnd = 0;
  let expiringIn7Days = 0;

  for (const subscription of subscriptions) {
    const status = subscription.status ?? 'expired';
    byStatus[status] = (byStatus[status] ?? 0) + 1;

    if (subscription.cancelAtPeriodEnd) {
      cancelAtPeriodEnd += 1;
    }

    const periodEnd = subscription.currentPeriodEnd;
    if (
      periodEnd &&
      isPeriodActive(periodEnd, now) &&
      ['trialing', 'active', 'past_due'].includes(status)
    ) {
      const end = periodEnd instanceof Date ? periodEnd : new Date(periodEnd);
      if (end <= in7Days) {
        expiringIn7Days += 1;
      }
    }
  }

  return {
    members: {
      students,
      managers,
      operators,
      total: students + managers + operators,
    },
    subscriptions: {
      byStatus,
      cancelAtPeriodEnd,
      expiringIn7Days,
      total: subscriptions.length,
    },
  };
}

export type OpsMemberListItem = {
  userId: number;
  username: string;
  email: string;
  schoolLevel: string | null;
  managerStatus: string | null;
  subscriptionStatus: string | null;
  isAccessAllowed: boolean | null;
};

export async function listOpsMembers(
  strapi: Core.Strapi,
  options: {
    page?: number;
    pageSize?: number;
    schoolLevel?: string;
    subscriptionStatus?: string;
    q?: string;
  }
) {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 20));
  const q = options.q?.trim().toLowerCase() ?? '';

  const profileWhere: Record<string, unknown> = {
    $or: [{ isOperator: false }, { isOperator: null }],
  };

  if (options.schoolLevel) {
    profileWhere.schoolLevel = options.schoolLevel;
  }

  let userIdFilter: number[] | null = null;

  if (q) {
    const users = (await strapi.db.query(USER_UID).findMany({
      where: {
        $or: [{ email: { $containsi: q } }, { username: { $containsi: q } }],
      },
    })) as Array<{ id: number }>;

    userIdFilter = users.map((user) => user.id);

    if (userIdFilter.length === 0) {
      return { items: [], page, pageSize, total: 0 };
    }
  }

  if (options.subscriptionStatus) {
    const subs = (await strapi.db.query(SUBSCRIPTION_UID).findMany({
      where: { status: options.subscriptionStatus },
      populate: ['user'],
    })) as SubscriptionRow[];

    const subUserIds = subs
      .map((sub) =>
        typeof sub.user === 'number' ? sub.user : (sub.user?.id ?? null)
      )
      .filter((id): id is number => id != null);

    if (subUserIds.length === 0) {
      return { items: [], page, pageSize, total: 0 };
    }

    userIdFilter = userIdFilter
      ? userIdFilter.filter((id) => subUserIds.includes(id))
      : subUserIds;

    if (userIdFilter.length === 0) {
      return { items: [], page, pageSize, total: 0 };
    }
  }

  if (userIdFilter) {
    profileWhere.user = { id: { $in: userIdFilter } };
  }

  const total = await strapi.db.query(USER_PROFILE_UID).count({ where: profileWhere });

  const profiles = (await strapi.db.query(USER_PROFILE_UID).findMany({
    where: profileWhere,
    populate: ['user'],
    orderBy: { id: 'desc' },
    limit: pageSize,
    offset: (page - 1) * pageSize,
  })) as ProfileRow[];

  const now = new Date();
  const items: OpsMemberListItem[] = [];

  for (const profile of profiles) {
    const userId = resolveUserId(profile.user);
    if (userId == null) {
      continue;
    }

    const user =
      typeof profile.user === 'object' && profile.user != null
        ? profile.user
        : ((await strapi.db.query(USER_UID).findOne({
            where: { id: userId },
          })) as { username?: string; email?: string } | null);

    let subscriptionStatus: string | null = null;
    let isAccessAllowed: boolean | null = null;

    if (isAnyStudentSchoolLevel(profile.schoolLevel)) {
      const summary = await getSubscriptionSummaryForUser(strapi, userId, now);
      subscriptionStatus = summary?.status ?? null;
      isAccessAllowed = summary?.isAccessAllowed ?? false;
    }

    items.push({
      userId,
      username: user?.username ?? '',
      email: user?.email ?? '',
      schoolLevel: profile.schoolLevel ?? null,
      managerStatus: profile.managerStatus ?? null,
      subscriptionStatus,
      isAccessAllowed,
    });
  }

  return { items, page, pageSize, total };
}

export type OpsSubscriptionListItem = {
  userId: number;
  username: string;
  email: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  nextBillingAmount: number | null;
  hasDiscount: boolean;
};

export async function listOpsSubscriptions(
  strapi: Core.Strapi,
  options: {
    page?: number;
    pageSize?: number;
    status?: string;
    cancelAtPeriodEnd?: boolean;
  }
) {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 20));

  const where: Record<string, unknown> = {};

  if (options.status) {
    where.status = options.status;
  }

  if (options.cancelAtPeriodEnd === true) {
    where.cancelAtPeriodEnd = true;
  }

  const total = await strapi.db.query(SUBSCRIPTION_UID).count({ where });
  const now = new Date();

  const subscriptions = (await strapi.db.query(SUBSCRIPTION_UID).findMany({
    where,
    populate: ['user', 'plan'],
    orderBy: { id: 'desc' },
    limit: pageSize,
    offset: (page - 1) * pageSize,
  })) as SubscriptionRow[];

  const items: OpsSubscriptionListItem[] = [];

  for (const subscription of subscriptions) {
    const userId =
      typeof subscription.user === 'number'
        ? subscription.user
        : (subscription.user?.id ?? null);

    if (userId == null) {
      continue;
    }

    const user =
      typeof subscription.user === 'object' && subscription.user != null
        ? subscription.user
        : ((await strapi.db.query(USER_UID).findOne({
            where: { id: userId },
          })) as { username?: string; email?: string } | null);

    const synced = await syncSubscriptionExpiry(strapi, subscription as never, now);
    const nextBilling = await resolveNextBillingBreakdown(strapi, synced, now);

    const hasDiscount =
      (subscription.discountPercent ?? 0) > 0 ||
      (subscription.discountFixedAmount ?? 0) > 0 ||
      (subscription.overridePrice ?? 0) > 0;

    items.push({
      userId,
      username: user?.username ?? '',
      email: user?.email ?? '',
      status: synced.status,
      currentPeriodEnd: toIso(synced.currentPeriodEnd),
      cancelAtPeriodEnd: synced.cancelAtPeriodEnd ?? false,
      nextBillingAmount: nextBilling?.billedAmount ?? null,
      hasDiscount,
    });
  }

  return { items, page, pageSize, total };
}

export async function getOpsSubscriptionDetail(strapi: Core.Strapi, userId: number) {
  const user = (await strapi.db.query(USER_UID).findOne({
    where: { id: userId },
  })) as { id: number; username?: string; email?: string } | null;

  if (!user) {
    return null;
  }

  const profile = (await strapi.db.query(USER_PROFILE_UID).findOne({
    where: { user: userId },
  })) as ProfileRow | null;

  if (!profile || profile.isOperator) {
    return null;
  }

  const now = new Date();
  let subscriptionSummary: SubscriptionSummary | null = null;

  if (isAnyStudentSchoolLevel(profile.schoolLevel)) {
    subscriptionSummary = await getSubscriptionSummaryForUser(strapi, userId, now);
  }

  const subscription = await getSubscriptionByUserId(strapi, userId);

  const paymentHistory = subscription
    ? ((await strapi.db.query(PAYMENT_HISTORY_UID).findMany({
        where: { subscription: subscription.id },
        orderBy: { paidAt: 'desc' },
        limit: 50,
      })) as Array<{
        id: number;
        amount?: number | null;
        status?: string | null;
        paidAt?: string | Date | null;
        pgPaymentId?: string | null;
      }>)
    : [];

  const managerCount = await strapi.db.query(ASSIGNMENT_UID).count({
    where: { student: userId },
  });

  return {
    user: {
      id: user.id,
      username: user.username ?? '',
      email: user.email ?? '',
    },
    profile: {
      schoolLevel: profile.schoolLevel ?? null,
      managerStatus: profile.managerStatus ?? null,
      schoolName: (profile as { schoolName?: string }).schoolName ?? null,
      grade: (profile as { grade?: string }).grade ?? null,
    },
    subscription: subscriptionSummary,
    discount: subscription
      ? {
          discountPercent: subscription.discountPercent ?? null,
          discountFixedAmount: subscription.discountFixedAmount ?? null,
          overridePrice: subscription.overridePrice ?? null,
          discountStartsAt: toIso(subscription.discountStartsAt),
          discountEndsAt: toIso(subscription.discountEndsAt),
          discountApplyOnce: subscription.discountApplyOnce ?? false,
          discountNote: subscription.discountNote ?? null,
          discountGrantedAt: toIso(subscription.discountGrantedAt),
          discountGrantedBy: subscription.discountGrantedBy ?? null,
        }
      : null,
    paymentHistory: paymentHistory.map((row) => ({
      id: row.id,
      amount: row.amount ?? null,
      status: row.status ?? null,
      paidAt: toIso(row.paidAt),
      pgPaymentKey: row.pgPaymentId ?? null,
    })),
    managerCount,
  };
}

export type OpsDiscountInput = {
  discountPercent?: number | null;
  discountFixedAmount?: number | null;
  overridePrice?: number | null;
  discountStartsAt?: string | null;
  discountEndsAt?: string | null;
  discountApplyOnce?: boolean | null;
  discountNote?: string | null;
};

function parseOptionalInt(
  value: unknown,
  field: string,
  options?: { min?: number; max?: number }
): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    throw new Error(`${field} must be an integer.`);
  }

  if (options?.min != null && parsed < options.min) {
    throw new Error(`${field} must be >= ${options.min}.`);
  }

  if (options?.max != null && parsed > options.max) {
    throw new Error(`${field} must be <= ${options.max}.`);
  }

  return parsed;
}

function parseOptionalDate(value: unknown, field: string): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    throw new Error(`${field} must be an ISO date string.`);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${field} is invalid.`);
  }

  return date.toISOString();
}

export function normalizeOpsDiscountInput(body: Record<string, unknown>): OpsDiscountInput {
  const discountPercent = parseOptionalInt(body.discountPercent, 'discountPercent', {
    min: 0,
    max: 100,
  });
  const discountFixedAmount = parseOptionalInt(body.discountFixedAmount, 'discountFixedAmount', {
    min: 0,
  });
  const overridePrice = parseOptionalInt(body.overridePrice, 'overridePrice', { min: 0 });
  const discountStartsAt = parseOptionalDate(body.discountStartsAt, 'discountStartsAt');
  const discountEndsAt = parseOptionalDate(body.discountEndsAt, 'discountEndsAt');
  const discountNote =
    body.discountNote === undefined
      ? undefined
      : body.discountNote == null
        ? null
        : String(body.discountNote).trim() || null;
  const discountApplyOnce =
    body.discountApplyOnce === undefined
      ? undefined
      : body.discountApplyOnce === true || body.discountApplyOnce === 'true';

  return {
    discountPercent,
    discountFixedAmount,
    overridePrice,
    discountStartsAt,
    discountEndsAt,
    discountApplyOnce,
    discountNote,
  };
}

export async function previewOpsSubscriptionDiscount(
  strapi: Core.Strapi,
  userId: number,
  input: OpsDiscountInput
) {
  const subscription = await getSubscriptionByUserId(strapi, userId);
  if (!subscription) {
    return null;
  }

  const plan = await resolvePlanForSubscription(strapi, subscription);
  if (!plan) {
    return null;
  }

  const merged = { ...subscription, ...input };
  const nextBilling = resolveBillingAmount(plan.price, merged);

  return {
    planPrice: plan.price,
    nextBilling,
    discount: input,
  };
}

export async function updateOpsSubscriptionDiscount(
  strapi: Core.Strapi,
  userId: number,
  input: OpsDiscountInput,
  grantedBy: string
) {
  const subscription = await getSubscriptionByUserId(strapi, userId);
  if (!subscription) {
    return null;
  }

  const preview = await previewOpsSubscriptionDiscount(strapi, userId, input);
  if (!preview) {
    return null;
  }

  const data: Record<string, unknown> = {
    discountGrantedAt: new Date(),
    discountGrantedBy: grantedBy,
  };

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      data[key] = value;
    }
  }

  await strapi.db.query(SUBSCRIPTION_UID).update({
    where: { id: subscription.id },
    data,
  });

  const summary = await getSubscriptionSummaryForUser(strapi, userId);

  return {
    preview,
    subscription: summary,
  };
}

export type OpsPendingManager = {
  userId: number;
  username: string;
  email: string;
  createdAt: string | null;
};

export async function listOpsPendingManagers(strapi: Core.Strapi) {
  const profiles = (await strapi.db.query(USER_PROFILE_UID).findMany({
    where: {
      schoolLevel: 'manager',
      managerStatus: 'pending',
      $or: [{ isOperator: false }, { isOperator: null }],
    },
    populate: ['user'],
    orderBy: { id: 'desc' },
  })) as Array<
    ProfileRow & { createdAt?: string | Date | null; user?: { id: number; username?: string; email?: string; createdAt?: string | Date | null } }
  >;

  return profiles
    .map((profile) => {
      const userId = resolveUserId(profile.user);
      if (userId == null) {
        return null;
      }

      const user =
        typeof profile.user === 'object' && profile.user != null ? profile.user : null;

      return {
        userId,
        username: user?.username ?? '',
        email: user?.email ?? '',
        createdAt: toIso(user?.createdAt ?? profile.createdAt ?? null),
      } satisfies OpsPendingManager;
    })
    .filter((item): item is OpsPendingManager => item != null);
}

async function updateManagerStatus(
  strapi: Core.Strapi,
  userId: number,
  status: 'approved' | 'rejected'
) {
  const profile = (await strapi.db.query(USER_PROFILE_UID).findOne({
    where: { user: userId },
    populate: ['user'],
  })) as (ProfileRow & { documentId?: string }) | null;

  if (!profile || profile.schoolLevel !== 'manager' || profile.managerStatus !== 'pending') {
    return null;
  }

  if (profile.documentId) {
    await strapi.documents(USER_PROFILE_UID).update({
      documentId: profile.documentId,
      data: { managerStatus: status },
    });
  } else {
    await strapi.db.query(USER_PROFILE_UID).update({
      where: { id: profile.id },
      data: { managerStatus: status },
    });
  }

  const user =
    typeof profile.user === 'object' && profile.user != null
      ? profile.user
      : ((await strapi.db.query(USER_UID).findOne({ where: { id: userId } })) as {
          username?: string;
          email?: string;
        } | null);

  return {
    userId,
    username: user?.username ?? '',
    email: user?.email ?? '',
    managerStatus: status,
  };
}

export async function approveOpsManager(strapi: Core.Strapi, userId: number) {
  return updateManagerStatus(strapi, userId, 'approved');
}

export async function rejectOpsManager(strapi: Core.Strapi, userId: number) {
  return updateManagerStatus(strapi, userId, 'rejected');
}

/** QA: approved manager → pending (approve flow 재테스트용). */
export async function markManagerPendingForQa(strapi: Core.Strapi, userId: number) {
  const profile = (await strapi.db.query(USER_PROFILE_UID).findOne({
    where: { user: userId },
    populate: ['user'],
  })) as (ProfileRow & { documentId?: string }) | null;

  if (!profile || profile.schoolLevel !== 'manager') {
    return null;
  }

  const data = { managerStatus: 'pending' as const };
  if (profile.documentId) {
    await strapi.documents(USER_PROFILE_UID).update({
      documentId: profile.documentId,
      data,
    });
  } else {
    await strapi.db.query(USER_PROFILE_UID).update({
      where: { id: profile.id },
      data,
    });
  }

  const user =
    typeof profile.user === 'object' && profile.user != null
      ? profile.user
      : ((await strapi.db.query(USER_UID).findOne({ where: { id: userId } })) as {
          username?: string;
          email?: string;
        } | null);

  return {
    userId,
    username: user?.username ?? '',
    email: user?.email ?? '',
    managerStatus: 'pending' as const,
  };
}
