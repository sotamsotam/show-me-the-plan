import {
  getBillingReadinessChecks,
  summarizeBillingReadiness,
} from '@/lib/billing/readiness';
import { NextRequest, NextResponse } from 'next/server';

function assertCronSecret(request: NextRequest): boolean {
  const expected = process.env.BILLING_CRON_SECRET?.trim();

  if (!expected) {
    return false;
  }

  const provided = request.headers.get('x-billing-cron-secret');
  return provided === expected;
}

export async function GET(request: NextRequest) {
  if (!assertCronSecret(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const summary = summarizeBillingReadiness(getBillingReadinessChecks());

  return NextResponse.json({
    ready: summary.ready,
    errorCount: summary.errorCount,
    warningCount: summary.warningCount,
    checks: summary.checks,
    webhookUrl: process.env.NEXTAUTH_URL
      ? `${process.env.NEXTAUTH_URL.replace(/\/$/, '')}/api/billing/webhooks/toss`
      : null,
    cronUrl: process.env.NEXTAUTH_URL
      ? `${process.env.NEXTAUTH_URL.replace(/\/$/, '')}/api/billing/cron/run`
      : null,
  });
}
