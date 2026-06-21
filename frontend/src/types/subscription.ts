export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'expired';

export const DEFAULT_MONTHLY_PLAN_CODE = 'student_monthly';

export interface BillingBreakdown {
  planPrice: number;
  discountAmount: number;
  billedAmount: number;
  skipPgCharge: boolean;
}

export interface SubscriptionPlanSummary {
  code: string;
  name: string;
  price: number;
  interval: string;
}

export interface SubscriptionSummary {
  status: SubscriptionStatus;
  isAccessAllowed: boolean;
  trialStartedAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasBillingKey: boolean;
  plan: SubscriptionPlanSummary | null;
  nextBilling: BillingBreakdown | null;
}

export interface PlanInfo {
  id: number;
  code: string;
  name: string;
  price: number;
  interval: string;
  targetSchoolLevels: string[];
}
