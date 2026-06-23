import {
  grantFreePeriodInternal,
  notifyPaymentFailed,
  notifyPaymentSucceeded,
  saveBillingKeyInternal,
} from '@/lib/billing/strapi-internal';
import { createBillingOrderId } from '@/lib/billing/auth';
import { getBillingKey, payWithBillingKey } from '@/lib/portone/server';
import type { BillingBreakdown } from '@/types/subscription';

const DEFAULT_PG_PROVIDER = 'portone' as const;

export async function completeBillingCheckout(input: {
  userId: number;
  planCode: string;
  planName: string;
  customerKey: string;
  billingKey: string;
  email: string;
  breakdown: BillingBreakdown;
  paymentId?: string;
}) {
  await getBillingKey(input.billingKey);

  await saveBillingKeyInternal({
    userId: input.userId,
    planCode: input.planCode,
    billingKey: input.billingKey,
    customerKey: input.customerKey,
    pgProvider: DEFAULT_PG_PROVIDER,
  });

  if (input.breakdown.skipPgCharge) {
    await grantFreePeriodInternal({
      userId: input.userId,
      planCode: input.planCode,
    });

    return {
      billingKey: input.billingKey,
      paymentId: null,
      amount: 0,
    };
  }

  const paymentId = input.paymentId ?? createBillingOrderId(input.userId);

  try {
    const payment = await payWithBillingKey({
      paymentId,
      billingKey: input.billingKey,
      orderName: input.planName,
      customerId: input.customerKey,
      customerEmail: input.email,
      amount: input.breakdown.billedAmount,
    });

    await notifyPaymentSucceeded({
      userId: input.userId,
      planCode: input.planCode,
      pgPaymentId: payment.paymentId,
      planPrice: input.breakdown.planPrice,
      discountAmount: input.breakdown.discountAmount,
      pointAmountUsed: input.breakdown.pointAmountUsed,
      amount: input.breakdown.billedAmount,
      receiptUrl: payment.receiptUrl ?? null,
      pgBillingKey: input.billingKey,
      pgCustomerId: input.customerKey,
      pgProvider: DEFAULT_PG_PROVIDER,
    });

    return {
      billingKey: input.billingKey,
      paymentId: payment.paymentId,
      amount: input.breakdown.billedAmount,
    };
  } catch (error) {
    await notifyPaymentFailed({
      userId: input.userId,
      pgPaymentId: paymentId,
    });
    throw error;
  }
}
