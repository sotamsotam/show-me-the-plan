import {
  grantFreePeriodInternal,
  listRenewalCandidates,
  notifyPaymentFailed,
  notifyPaymentSucceeded,
} from '@/lib/billing/strapi-internal';
import { logBillingEvent } from '@/lib/billing/logger';
import { createBillingOrderId } from '@/lib/billing/auth';
import { chargeBillingKey } from '@/lib/toss/server';
import { isTossConfigured } from '@/lib/toss/config';
import { NextRequest, NextResponse } from 'next/server';

function assertCronSecret(request: NextRequest): boolean {
  const expected = process.env.BILLING_CRON_SECRET?.trim();

  if (!expected) {
    return false;
  }

  const provided = request.headers.get('x-billing-cron-secret');
  return provided === expected;
}

export async function POST(request: NextRequest) {
  if (!assertCronSecret(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!isTossConfigured()) {
    return NextResponse.json(
      { error: 'TOSS_SECRET_KEY is not configured.' },
      { status: 503 }
    );
  }

  const candidates = await listRenewalCandidates();
  const results: Array<{ userId: number; ok: boolean; error?: string }> = [];

  logBillingEvent('info', 'cron.renewal_started', { candidateCount: candidates.length });

  for (const candidate of candidates) {
    try {
      if (candidate.breakdown.skipPgCharge) {
        await grantFreePeriodInternal({
          userId: candidate.userId,
          planCode: candidate.planCode,
        });
        results.push({ userId: candidate.userId, ok: true });
        continue;
      }

      const orderId = createBillingOrderId(candidate.userId);
      const payment = await chargeBillingKey({
        billingKey: candidate.billingKey,
        customerKey: candidate.customerKey,
        amount: candidate.breakdown.billedAmount,
        orderId,
        orderName: candidate.orderName,
      });

      await notifyPaymentSucceeded({
        userId: candidate.userId,
        planCode: candidate.planCode,
        pgPaymentId: payment.paymentKey,
        planPrice: candidate.breakdown.planPrice,
        discountAmount: candidate.breakdown.discountAmount,
        amount: candidate.breakdown.billedAmount,
        receiptUrl: payment.receipt?.url ?? null,
        pgBillingKey: candidate.billingKey,
        pgCustomerId: candidate.customerKey,
      });

      results.push({ userId: candidate.userId, ok: true });
    } catch (error) {
      await notifyPaymentFailed({
        userId: candidate.userId,
      });

      results.push({
        userId: candidate.userId,
        ok: false,
        error: error instanceof Error ? error.message : 'renewal failed',
      });
    }
  }

  const successCount = results.filter((result) => result.ok).length;
  const failureCount = results.length - successCount;

  logBillingEvent('info', 'cron.renewal_finished', {
    processed: results.length,
    successCount,
    failureCount,
  });

  return NextResponse.json({
    processed: results.length,
    successCount,
    failureCount,
    results,
  });
}
