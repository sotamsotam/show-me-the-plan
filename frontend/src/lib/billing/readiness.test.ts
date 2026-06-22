import { describe, expect, it } from 'vitest';
import { getBillingReadinessChecks, summarizeBillingReadiness } from './readiness';

describe('getBillingReadinessChecks', () => {
  it('flags missing secrets in production', () => {
    const checks = getBillingReadinessChecks({
      NODE_ENV: 'production',
      PORTONE_API_SECRET: 'api-secret',
      NEXT_PUBLIC_PORTONE_STORE_ID: 'store-id',
      NEXT_PUBLIC_PORTONE_CHANNEL_KEY: 'channel-key',
      PORTONE_WEBHOOK_SECRET: 'webhook-secret',
      BILLING_INTERNAL_SECRET: 'internal',
      BILLING_CRON_SECRET: 'cron',
      BILLING_ENCRYPTION_KEY: 'encryption-key-32-characters-min!!',
      PORTONE_WEBHOOK_SKIP_VERIFY: 'true',
      NEXTAUTH_URL: 'https://example.com',
    });

    const summary = summarizeBillingReadiness(checks);
    expect(summary.ready).toBe(false);
    expect(checks.find((check) => check.id === 'webhook_signature')?.ok).toBe(false);
  });

  it('is ready when production env is complete', () => {
    const checks = getBillingReadinessChecks({
      NODE_ENV: 'production',
      PORTONE_API_SECRET: 'api-secret',
      NEXT_PUBLIC_PORTONE_STORE_ID: 'store-id',
      NEXT_PUBLIC_PORTONE_CHANNEL_KEY: 'channel-key',
      PORTONE_WEBHOOK_SECRET: 'webhook-secret',
      BILLING_INTERNAL_SECRET: 'internal',
      BILLING_CRON_SECRET: 'cron',
      BILLING_ENCRYPTION_KEY: 'encryption-key-32-characters-min!!',
      PORTONE_WEBHOOK_SKIP_VERIFY: 'false',
      NEXTAUTH_URL: 'https://example.com',
    });

    expect(summarizeBillingReadiness(checks).ready).toBe(true);
  });
});
