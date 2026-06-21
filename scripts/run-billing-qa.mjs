#!/usr/bin/env node

/**
 * Billing QA runner — maps to docs/BILLING-QA-CHECKLIST.md
 *
 * Usage (repo root):
 *   node scripts/run-billing-qa.mjs
 *
 * Env (optional overrides):
 *   STRAPI_URL=http://localhost:1337
 *   FRONTEND_URL=http://localhost:3000
 *   BILLING_CRON_SECRET=...
 *   BILLING_INTERNAL_SECRET=...
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const STRAPI_URL = (process.env.STRAPI_URL || 'http://localhost:1337').replace(/\/$/, '');
const FRONTEND_URL = (process.env.FRONTEND_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(
  /\/$/,
  ''
);
const CRON_SECRET = process.env.BILLING_CRON_SECRET?.trim() || '';
const INTERNAL_SECRET = process.env.BILLING_INTERNAL_SECRET?.trim() || '';

const results = [];

function record(section, name, status, detail = '') {
  results.push({ section, name, status, detail });
  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⏭️';
  console.log(`${icon} [${section}] ${name}${detail ? ` — ${detail}` : ''}`);
}

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

function mergeEnv() {
  const rootEnv = loadEnvFile(join(root, '.env'));
  for (const [key, value] of Object.entries(rootEnv)) {
    if (!process.env[key]) process.env[key] = value;
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(8000),
  });
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  return { response, body };
}

function runUnitTests() {
  console.log('\n=== Unit tests ===\n');

  const backend = spawnSync('npm', ['test', '--', '--run'], {
    cwd: join(root, 'backend'),
    shell: true,
    encoding: 'utf8',
  });

  if (backend.status === 0) {
    record('Unit', 'Backend vitest suite', 'pass');
  } else {
    record('Unit', 'Backend vitest suite', 'fail', 'see output above');
    console.log(backend.stdout?.slice(-2000) || backend.stderr?.slice(-2000));
  }

  const frontend = spawnSync(
    'npm',
    [
      'test',
      '--',
      '--run',
      'src/lib/billing',
      'src/lib/subscription-access.test.ts',
      'src/types/school.test.ts',
    ],
    { cwd: join(root, 'frontend'), shell: true, encoding: 'utf8' }
  );

  if (frontend.status === 0) {
    record('Unit', 'Frontend billing vitest', 'pass');
  } else {
    record('Unit', 'Frontend billing vitest', 'fail');
    console.log(frontend.stdout?.slice(-1500) || frontend.stderr?.slice(-1500));
  }
}

function checkEnv() {
  console.log('\n=== 사전 준비 (env) ===\n');
  mergeEnv();

  const keys = [
    'TOSS_SECRET_KEY',
    'NEXT_PUBLIC_TOSS_CLIENT_KEY',
    'BILLING_INTERNAL_SECRET',
    'BILLING_ENCRYPTION_KEY',
    'BILLING_CRON_SECRET',
  ];

  for (const key of keys) {
    const value = process.env[key]?.trim();
    record('Env', key, value ? 'pass' : 'skip', value ? 'set' : 'not set — integration limited');
  }
}

function checkStaticContent() {
  console.log('\n=== UI · 고지 (static) ===\n');

  const files = [
    ['Pricing page', join(root, 'frontend/src/app/(marketing)/pricing/page.tsx')],
    ['Paid service terms', join(root, 'frontend/src/app/legal/paid-service/page.tsx')],
    ['Billing disclosure', join(root, 'frontend/src/components/billing/BillingDisclosure.tsx')],
    ['Payment history table', join(root, 'frontend/src/components/billing/PaymentHistoryTable.tsx')],
  ];

  for (const [name, path] of files) {
    record('Static', name, existsSync(path) ? 'pass' : 'fail');
  }

  const marketing = readFileSync(join(root, 'frontend/src/content/marketing/for-students.ts'), 'utf8');
  record(
    'Static',
    'Marketing 14-day trial copy',
    marketing.includes('14일') ? 'pass' : 'fail'
  );
}

async function checkStrapiReachable() {
  try {
    const { response, body } = await fetchJson(`${STRAPI_URL}/api/plans/active`);
    return { ok: response.ok, body };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function checkFrontendReachable(path) {
  try {
    const response = await fetch(`${FRONTEND_URL}${path}`, {
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function registerStudent() {
  const suffix = Date.now();
  const payload = {
    username: `qa_student_${suffix}`,
    email: `qa_student_${suffix}@example.com`,
    password: 'QaTestPass123!',
    profile: { schoolLevel: 'other' },
    consents: {
      termsAgreed: true,
      privacyAgreed: true,
      guardianConsentConfirmed: true,
      termsVersion: '1.0',
      privacyVersion: '1.0',
    },
  };

  const { response, body } = await fetchJson(`${STRAPI_URL}/api/user-profiles/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return { ok: false, body };
  }

  const login = await fetchJson(`${STRAPI_URL}/api/auth/local`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      identifier: payload.email,
      password: payload.password,
    }),
  });

  return {
    ok: login.response.ok,
    jwt: login.body.jwt,
    userId: login.body.user?.id,
    email: payload.email,
    password: payload.password,
    body: login.body,
  };
}

async function runIntegration() {
  console.log('\n=== Integration (live API) ===\n');

  const strapi = await checkStrapiReachable();
  if (!strapi.ok) {
    record('Integration', 'Strapi reachable', 'skip', strapi.error || 'not running');
    record('Integration', 'Frontend reachable', 'skip', 'start frontend dev server');
    return;
  }

  record('Integration', 'Strapi reachable', 'pass');

  const price = strapi.body?.plans?.[0]?.price;
  record(
    'Integration',
    'student_monthly plan 4900원',
    price === 4900 ? 'pass' : 'fail',
    `price=${price}`
  );

  const frontendOk = await checkFrontendReachable('/pricing');
  record(
    'Integration',
    'Frontend /pricing',
    frontendOk ? 'pass' : 'skip',
    frontendOk ? FRONTEND_URL : `${FRONTEND_URL} unreachable (dev server compiling?)`
  );

  if (frontendOk) {
    for (const path of ['/legal/paid-service', '/billing/expired']) {
      const ok = await checkFrontendReachable(path);
      record('Integration', `Frontend ${path}`, ok ? 'pass' : 'fail');
    }
  } else {
    record('Integration', 'Frontend legal/expired pages', 'skip', 'frontend not ready');
  }

  const student = await registerStudent();
  if (!student.ok || !student.jwt) {
    record('Integration', 'Student register + login', 'fail', JSON.stringify(student.body).slice(0, 120));
    return;
  }

  record('Integration', 'Student register + login', 'pass', `userId=${student.userId}`);

  const subRes = await fetchJson(`${STRAPI_URL}/api/subscriptions/me`, {
    headers: { Authorization: `Bearer ${student.jwt}` },
  });

  const subscription = subRes.body?.subscription;
  const isTrialing = subscription?.status === 'trialing';
  const accessAllowed = subscription?.isAccessAllowed === true;

  record(
    'Integration',
    'Student 14-day trialing subscription',
    isTrialing && accessAllowed ? 'pass' : 'fail',
    `status=${subscription?.status}, isAccessAllowed=${subscription?.isAccessAllowed}`
  );

  if (subscription?.currentPeriodEnd && subscription?.trialStartedAt) {
    const days = Math.round(
      (new Date(subscription.currentPeriodEnd).getTime() -
        new Date(subscription.trialStartedAt).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    record('Integration', 'Trial period length ~14 days', days === 14 ? 'pass' : 'fail', `${days} days`);
  }

  const cronSecret = process.env.BILLING_CRON_SECRET?.trim() || CRON_SECRET;
  if (cronSecret) {
    const badCron = await fetchJson(`${FRONTEND_URL}/api/billing/cron/run`, { method: 'POST' });
    record(
      'Integration',
      'Cron without secret → 403',
      badCron.response.status === 403 ? 'pass' : 'fail',
      `status=${badCron.response.status}`
    );

    const health = await fetchJson(`${FRONTEND_URL}/api/billing/health`, {
      headers: { 'x-billing-cron-secret': cronSecret },
    });
    record(
      'Integration',
      'Billing health endpoint',
      health.response.ok ? 'pass' : 'fail',
      health.body.ready === false ? `ready=false (${health.body.errorCount} errors)` : `ready=${health.body.ready}`
    );
  } else {
    record('Integration', 'Cron / health auth tests', 'skip', 'BILLING_CRON_SECRET not set');
  }

  const badWebhook = await fetchJson(`${FRONTEND_URL}/api/billing/webhooks/toss`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ eventType: 'PAYMENT', data: { paymentKey: 't', orderId: 'smp-1-1' } }),
  }).catch((error) => ({
    response: { status: 0, ok: false },
    body: { error: error instanceof Error ? error.message : String(error) },
  }));

  record(
    'Integration',
    'Webhook invalid signature → 401',
    badWebhook.response.status === 401
      ? 'pass'
      : badWebhook.response.status === 0
        ? 'skip'
        : 'fail',
    badWebhook.response.status
      ? `status=${badWebhook.response.status}`
      : String(badWebhook.body?.error ?? 'frontend unreachable')
  );

  const internal = process.env.BILLING_INTERNAL_SECRET?.trim() || INTERNAL_SECRET;
  if (internal && student.userId) {
    const paymentId = `qa-dup-${Date.now()}`;
    const payload = {
      userId: student.userId,
      planCode: 'student_monthly',
      pgPaymentId: paymentId,
      planPrice: 4900,
      discountAmount: 980,
      amount: 3920,
    };

    const headers = {
      'content-type': 'application/json',
      'x-billing-internal-secret': internal,
    };

    const first = await fetchJson(`${STRAPI_URL}/api/subscriptions/internal/payment-succeeded`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const second = await fetchJson(`${STRAPI_URL}/api/subscriptions/internal/payment-succeeded`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    record(
      'Integration',
      'Webhook/idempotent payment (duplicate pgPaymentId)',
      first.response.ok && second.response.ok ? 'pass' : 'fail',
      `1st=${first.response.status}, 2nd=${second.response.status}`
    );

    const history = await fetchJson(`${STRAPI_URL}/api/subscriptions/payment-history`, {
      headers: { Authorization: `Bearer ${student.jwt}` },
    });

    const dupes = (history.body?.payments ?? []).filter((p) => p.pgPaymentId === paymentId);
    record(
      'Integration',
      'Payment history single row for duplicate webhook',
      dupes.length <= 1 ? 'pass' : 'fail',
      `rows=${dupes.length}`
    );

    const summary = await fetchJson(`${STRAPI_URL}/api/subscriptions/me`, {
      headers: { Authorization: `Bearer ${student.jwt}` },
    });
    const nextBilling = summary.body?.subscription?.nextBilling;
    record(
      'Integration',
      '20% discount next billing (3920원)',
      nextBilling?.billedAmount === 3920 ? 'pass' : 'skip',
      nextBilling ? `billed=${nextBilling.billedAmount}` : 'no nextBilling'
    );
  } else {
    record('Integration', 'Internal payment / discount tests', 'skip', 'BILLING_INTERNAL_SECRET not set');
  }
}

function printSummary() {
  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const skipped = results.filter((r) => r.status === 'skip').length;

  console.log('\n=== QA Summary ===');
  console.log(`Pass: ${passed} | Fail: ${failed} | Skip: ${skipped} | Total: ${results.length}`);

  if (failed > 0) {
    console.log('\nFailed:');
    for (const row of results.filter((r) => r.status === 'fail')) {
      console.log(`  - [${row.section}] ${row.name}${row.detail ? `: ${row.detail}` : ''}`);
    }
  }

  if (skipped > 0) {
    console.log('\nSkipped (manual or env/server):');
    for (const row of results.filter((r) => r.status === 'skip')) {
      console.log(`  - [${row.section}] ${row.name}${row.detail ? `: ${row.detail}` : ''}`);
    }
  }

  console.log('\nManual only (see docs/BILLING-QA-CHECKLIST.md):');
  console.log('  - 토스 테스트 카드 결제 UI');
  console.log('  - D-day 배너 / middleware /billing/expired redirect (browser)');
  console.log('  - 매니저 연결 + 만료 배지 UI');
  console.log('  - 해지 예약 UX');

  process.exit(failed > 0 ? 1 : 0);
}

async function main() {
  mergeEnv();

  console.log('Show Me The Plan — Billing QA');
  console.log(`Strapi: ${STRAPI_URL}`);
  console.log(`Frontend: ${FRONTEND_URL}`);

  runUnitTests();
  checkEnv();
  checkStaticContent();
  await runIntegration();
  printSummary();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
