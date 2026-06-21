import { describe, expect, it } from 'vitest';
import { getBillingReadinessChecks, summarizeBillingReadiness } from './readiness';

describe('getBillingReadinessChecks', () => {
  it('flags missing secrets in production', () => {
    const checks = getBillingReadinessChecks({
      NODE_ENV: 'production',
      TOSS_SECRET_KEY: 'live_sk_test',
      NEXT_PUBLIC_TOSS_CLIENT_KEY: 'live_ck_test',
      BILLING_INTERNAL_SECRET: 'internal',
      BILLING_CRON_SECRET: 'cron',
      BILLING_ENCRYPTION_KEY: 'encryption-key-32-characters-min!!',
      TOSS_WEBHOOK_SKIP_VERIFY: 'true',
      NEXTAUTH_URL: 'https://example.com',
    });

    const summary = summarizeBillingReadiness(checks);
    expect(summary.ready).toBe(false);
    expect(checks.find((check) => check.id === 'webhook_signature')?.ok).toBe(false);
  });

  it('is ready when production env is complete', () => {
    const checks = getBillingReadinessChecks({
      NODE_ENV: 'production',
      TOSS_SECRET_KEY: 'live_sk_test',
      NEXT_PUBLIC_TOSS_CLIENT_KEY: 'live_ck_test',
      BILLING_INTERNAL_SECRET: 'internal',
      BILLING_CRON_SECRET: 'cron',
      BILLING_ENCRYPTION_KEY: 'encryption-key-32-characters-min!!',
      TOSS_WEBHOOK_SKIP_VERIFY: 'false',
      NEXTAUTH_URL: 'https://example.com',
    });

    expect(summarizeBillingReadiness(checks).ready).toBe(true);
  });
});
