export const TRIAL_DAYS = 14;

export const DEFAULT_MONTHLY_PLAN_CODE = 'student_monthly';

export const SUBSCRIPTION_STATUSES = [
  'trialing',
  'active',
  'past_due',
  'canceled',
  'expired',
] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const SUBSCRIPTION_UID = 'api::subscription.subscription' as const;
export const PLAN_UID = 'api::plan.plan' as const;
export const PAYMENT_HISTORY_UID = 'api::payment-history.payment-history' as const;
