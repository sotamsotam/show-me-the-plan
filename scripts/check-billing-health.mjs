#!/usr/bin/env node

/**
 * Checks billing production readiness via BFF health endpoint.
 *
 * Required env:
 *   NEXTAUTH_URL
 *   BILLING_CRON_SECRET
 *
 * Usage:
 *   node scripts/check-billing-health.mjs
 *   npm run billing:health
 */

const baseUrl = (process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '');
const secret = process.env.BILLING_CRON_SECRET?.trim();

if (!secret) {
  console.error('[billing:health] BILLING_CRON_SECRET is required.');
  process.exit(1);
}

const targetUrl = `${baseUrl}/api/billing/health`;

async function main() {
  const response = await fetch(targetUrl, {
    method: 'GET',
    headers: {
      'x-billing-cron-secret': secret,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('[billing:health] failed', response.status, data);
    process.exit(1);
  }

  console.log(JSON.stringify(data, null, 2));

  if (!data.ready) {
    process.exit(2);
  }
}

main().catch((error) => {
  console.error('[billing:health] error', error instanceof Error ? error.message : error);
  process.exit(1);
});
