#!/usr/bin/env node

/**
 * Calls Next.js BFF billing cron (subscription renewals).
 *
 * Required env:
 *   NEXTAUTH_URL          e.g. https://your-domain.example.com
 *   BILLING_CRON_SECRET   same as frontend container
 *
 * Usage:
 *   node scripts/run-billing-cron.mjs
 *   npm run billing:cron
 */

const baseUrl = (process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '');
const secret = process.env.BILLING_CRON_SECRET?.trim();

if (!secret) {
  console.error('[billing:cron] BILLING_CRON_SECRET is required.');
  process.exit(1);
}

const targetUrl = `${baseUrl}/api/billing/cron/run`;

async function main() {
  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'x-billing-cron-secret': secret,
      'content-type': 'application/json',
    },
  });

  const body = await response.text();
  let parsed;

  try {
    parsed = JSON.parse(body);
  } catch {
    parsed = { raw: body };
  }

  if (!response.ok) {
    console.error('[billing:cron] failed', response.status, parsed);
    process.exit(1);
  }

  console.log('[billing:cron] ok', parsed);
}

main().catch((error) => {
  console.error('[billing:cron] error', error instanceof Error ? error.message : error);
  process.exit(1);
});
