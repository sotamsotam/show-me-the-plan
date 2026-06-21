import {
  notifyPaymentFailed,
  notifyPaymentSucceeded,
} from '@/lib/billing/strapi-internal';
import { logBillingEvent } from '@/lib/billing/logger';
import { getTossSecretKey } from '@/lib/toss/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

type TossWebhookPayload = {
  eventType?: string;
  data?: {
    paymentKey?: string;
    orderId?: string;
    status?: string;
    totalAmount?: number;
    receipt?: { url?: string };
    customerKey?: string;
    metadata?: {
      userId?: number;
      planCode?: string;
      planPrice?: number;
      discountAmount?: number;
    };
  };
};

function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (process.env.TOSS_WEBHOOK_SKIP_VERIFY === 'true') {
    return true;
  }

  if (!signature) {
    return false;
  }

  const secret = getTossSecretKey();
  const expected = createHmac('sha256', secret).update(rawBody).digest('base64');

  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

function parseUserIdFromOrderId(orderId?: string): number | null {
  if (!orderId) {
    return null;
  }

  const match = orderId.match(/^smp-(\d+)-/);
  return match ? Number(match[1]) : null;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('tosspayments-webhook-signature');

  if (!verifyWebhookSignature(rawBody, signature)) {
    logBillingEvent('warn', 'webhook.signature_invalid', {
      hasSignature: Boolean(signature),
    });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: TossWebhookPayload;

  try {
    payload = JSON.parse(rawBody) as TossWebhookPayload;
  } catch (error) {
    logBillingEvent('error', 'webhook.invalid_json', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
  const data = payload.data;

  if (!data?.paymentKey || !data.orderId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const userId = data.metadata?.userId ?? parseUserIdFromOrderId(data.orderId);
  const planCode = data.metadata?.planCode ?? 'student_monthly';

  if (!userId) {
    logBillingEvent('warn', 'webhook.user_not_found', {
      orderId: data.orderId,
      paymentKey: data.paymentKey,
    });
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (data.status === 'DONE') {
    try {
      await notifyPaymentSucceeded({
        userId,
        planCode,
        pgPaymentId: data.paymentKey,
        planPrice: data.metadata?.planPrice ?? data.totalAmount ?? 0,
        discountAmount: data.metadata?.discountAmount ?? 0,
        amount: data.totalAmount ?? 0,
        receiptUrl: data.receipt?.url ?? null,
        pgCustomerId: data.customerKey ?? null,
      });
      logBillingEvent('info', 'webhook.payment_succeeded', {
        userId,
        orderId: data.orderId,
        amount: data.totalAmount ?? 0,
      });
    } catch (error) {
      logBillingEvent('error', 'webhook.payment_succeeded_failed', {
        userId,
        orderId: data.orderId,
        error: error instanceof Error ? error.message : 'unknown',
      });
      return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
    }
  } else if (data.status === 'ABORTED' || data.status === 'CANCELED') {
    try {
      await notifyPaymentFailed({
        userId,
        pgPaymentId: data.paymentKey,
      });
      logBillingEvent('warn', 'webhook.payment_failed', {
        userId,
        orderId: data.orderId,
        status: data.status,
      });
    } catch (error) {
      logBillingEvent('error', 'webhook.payment_failed_notify_error', {
        userId,
        orderId: data.orderId,
        error: error instanceof Error ? error.message : 'unknown',
      });
      return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
