import {
  notifyPaymentFailed,
  notifyPaymentSucceeded,
} from '@/lib/billing/strapi-internal';
import { parseUserIdFromPaymentId } from '@/lib/billing/auth';
import { logBillingEvent } from '@/lib/billing/logger';
import {
  getPortOneWebhookSecret,
  isPortOneWebhookVerifyEnabled,
} from '@/lib/portone/config';
import { getPayment } from '@/lib/portone/server';
import { DEFAULT_MONTHLY_PLAN_CODE } from '@/types/subscription';
import {
  isUnrecognizedWebhook,
  verify as verifyPortOneWebhook,
} from '@portone/server-sdk/webhook';
import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_PG_PROVIDER = 'portone' as const;

function headersFromRequest(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {};

  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return headers;
}

async function parseWebhook(request: NextRequest, rawBody: string) {
  if (!isPortOneWebhookVerifyEnabled()) {
    return JSON.parse(rawBody) as {
      type: string;
      data?: { paymentId?: string };
    };
  }

  return verifyPortOneWebhook(
    getPortOneWebhookSecret(),
    rawBody,
    headersFromRequest(request)
  );
}

type ParsedWebhook = Awaited<ReturnType<typeof parseWebhook>>;
type VerifiedWebhook = Awaited<ReturnType<typeof verifyPortOneWebhook>>;

function getPaymentIdFromWebhook(webhook: ParsedWebhook): string | undefined {
  const payload = webhook as { type?: string; data?: { paymentId?: string } };
  const type = payload.type ?? '';

  if (type !== 'Transaction.Paid' && type !== 'Transaction.Failed') {
    return undefined;
  }

  return payload.data?.paymentId;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  let webhook: Awaited<ReturnType<typeof parseWebhook>>;

  try {
    webhook = await parseWebhook(request, rawBody);
  } catch (error) {
    logBillingEvent('warn', 'webhook.signature_invalid', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  if (isPortOneWebhookVerifyEnabled() && isUnrecognizedWebhook(webhook as VerifiedWebhook)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const paymentId = getPaymentIdFromWebhook(webhook);

  if (!paymentId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const userId = parseUserIdFromPaymentId(paymentId);

  if (!userId) {
    logBillingEvent('warn', 'webhook.user_not_found', { paymentId });
    return NextResponse.json({ ok: true, ignored: true });
  }

  const eventType = (webhook as { type?: string }).type ?? '';

  if (eventType === 'Transaction.Paid') {
    try {
      const payment = await getPayment(paymentId);

      if (payment.status !== 'PAID') {
        return NextResponse.json({ ok: true, ignored: true });
      }

      const amount = payment.amount?.total ?? 0;

      await notifyPaymentSucceeded({
        userId,
        planCode: DEFAULT_MONTHLY_PLAN_CODE,
        pgPaymentId: payment.id ?? paymentId,
        planPrice: amount,
        discountAmount: 0,
        amount,
        receiptUrl: payment.receiptUrl ?? null,
        pgCustomerId: payment.customer?.id ?? null,
        pgProvider: DEFAULT_PG_PROVIDER,
      });

      logBillingEvent('info', 'webhook.payment_succeeded', {
        userId,
        paymentId,
        amount,
      });
    } catch (error) {
      logBillingEvent('error', 'webhook.payment_succeeded_failed', {
        userId,
        paymentId,
        error: error instanceof Error ? error.message : 'unknown',
      });
      return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
    }
  } else if (eventType === 'Transaction.Failed') {
    try {
      await notifyPaymentFailed({
        userId,
        pgPaymentId: paymentId,
      });
      logBillingEvent('warn', 'webhook.payment_failed', {
        userId,
        paymentId,
        status: eventType,
      });
    } catch (error) {
      logBillingEvent('error', 'webhook.payment_failed_notify_error', {
        userId,
        paymentId,
        error: error instanceof Error ? error.message : 'unknown',
      });
      return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
