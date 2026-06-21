import {
  grantFreePeriodInternal,
  notifyPaymentFailed,
  notifyPaymentSucceeded,
  saveBillingKeyInternal,
} from '@/lib/billing/strapi-internal';
import { chargeBillingKey, issueBillingKey } from '@/lib/toss/server';
import type { BillingBreakdown } from '@/types/subscription';

export async function completeBillingCheckout(input: {
  userId: number;
  planCode: string;
  planName: string;
  customerKey: string;
  authKey: string;
  email: string;
  breakdown: BillingBreakdown;
}) {
  const billing = await issueBillingKey({
    authKey: input.authKey,
    customerKey: input.customerKey,
  });

  await saveBillingKeyInternal({
    userId: input.userId,
    planCode: input.planCode,
    billingKey: billing.billingKey,
    customerKey: input.customerKey,
  });

  if (input.breakdown.skipPgCharge) {
    await grantFreePeriodInternal({
      userId: input.userId,
      planCode: input.planCode,
    });

    return {
      billingKey: billing.billingKey,
      paymentKey: null,
      amount: 0,
    };
  }

  const orderId = `smp-${input.userId}-${Date.now()}`;

  try {
    const payment = await chargeBillingKey({
      billingKey: billing.billingKey,
      customerKey: input.customerKey,
      amount: input.breakdown.billedAmount,
      orderId,
      orderName: input.planName,
      customerEmail: input.email,
    });

    await notifyPaymentSucceeded({
      userId: input.userId,
      planCode: input.planCode,
      pgPaymentId: payment.paymentKey,
      planPrice: input.breakdown.planPrice,
      discountAmount: input.breakdown.discountAmount,
      amount: input.breakdown.billedAmount,
      receiptUrl: payment.receipt?.url ?? null,
      pgBillingKey: billing.billingKey,
      pgCustomerId: input.customerKey,
    });

    return {
      billingKey: billing.billingKey,
      paymentKey: payment.paymentKey,
      amount: input.breakdown.billedAmount,
    };
  } catch (error) {
    await notifyPaymentFailed({
      userId: input.userId,
      pgPaymentId: orderId,
    });
    throw error;
  }
}
