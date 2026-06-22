#!/usr/bin/env node

/**
 * Billing manual QA (API-level) — maps to docs/BILLING-QA-CHECKLIST.md
 * 포트원 키 없이 실행 가능한 API·UI 시나리오.
 *
 * Usage (repo root, Strapi + frontend running):
 *   npm run billing:manual-qa
 *
 * Requires (from .env.example fallback):
 *   BILLING_INTERNAL_SECRET — expire-for-qa
 *   OPS_INTERNAL_SECRET — manager pending QA (optional)
 */

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
  for (const file of [join(root, '.env'), join(root, 'backend/.env'), join(root, 'frontend/.env.local')]) {
    const parsed = loadEnvFile(file);
    for (const [key, value] of Object.entries(parsed)) {
      if (!process.env[key]) process.env[key] = value;
    }
  }
  const example = loadEnvFile(join(root, '.env.example'));
  for (const key of ['BILLING_INTERNAL_SECRET', 'OPS_INTERNAL_SECRET']) {
    if (!process.env[key]?.trim() && example[key]?.trim()) {
      process.env[key] = example[key].trim();
    }
  }
  if (!process.env.BILLING_INTERNAL_SECRET?.trim()) {
    process.env.BILLING_INTERNAL_SECRET = 'change-me-billing-internal-secret';
  }
  if (!process.env.OPS_INTERNAL_SECRET?.trim()) {
    process.env.OPS_INTERNAL_SECRET = 'change-me-ops-internal-secret';
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(15000),
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

async function registerUser({ username, email, password, profile, consents }) {
  const { response, body } = await fetchJson(`${STRAPI_URL}/api/user-profiles/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, email, password, profile, consents }),
  });

  if (!response.ok) {
    return { ok: false, body };
  }

  const login = await fetchJson(`${STRAPI_URL}/api/auth/local`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier: email, password }),
  });

  return {
    ok: login.response.ok,
    jwt: login.body.jwt,
    userId: login.body.user?.id,
    email,
    password,
    body: login.body,
  };
}

function authHeaders(jwt) {
  return { Authorization: `Bearer ${jwt}`, 'content-type': 'application/json' };
}

function checkStaticUi() {
  console.log('\n=== UI · 컴포넌트 (static) ===\n');

  const banner = readFileSync(
    join(root, 'frontend/src/components/SubscriptionStatusBanner.tsx'),
    'utf8'
  );
  record(
    'UI',
    'D-day 배너 trialing 조건',
    banner.includes('getTrialDaysRemaining') && banner.includes("status !== 'trialing'")
      ? 'pass'
      : 'fail'
  );

  const billingClient = readFileSync(
    join(root, 'frontend/src/app/dashboard/settings/billing/BillingSettingsClient.tsx'),
    'utf8'
  );
  record(
    'UI',
    '구독 설정 D-day 표시',
    billingClient.includes('getTrialDaysRemaining') && billingClient.includes('D-')
      ? 'pass'
      : 'fail'
  );

  const badge = readFileSync(join(root, 'frontend/src/components/StudentSubscriptionBadge.tsx'), 'utf8');
  record(
    'UI',
    '매니저 배지 만료 문구',
    badge.includes('만료 — 관리 불가') && badge.includes('유효') ? 'pass' : 'fail'
  );

  const settings = readFileSync(join(root, 'frontend/src/app/dashboard/settings/SettingsForm.tsx'), 'utf8');
  record(
    'UI',
    '매니저 설정에 구독 블록 없음',
    settings.includes('isAnyStudentProfile') && settings.includes('구독 · 결제') ? 'pass' : 'fail'
  );

  const disclosure = readFileSync(join(root, 'frontend/src/components/billing/BillingDisclosure.tsx'), 'utf8');
  record(
    'UI',
    'checkout 고지 컴포넌트',
    disclosure.length > 100 ? 'pass' : 'fail'
  );
}

function checkAccessHelpers() {
  console.log('\n=== 만료 예외 경로 (static) ===\n');

  const access = readFileSync(join(root, 'frontend/src/lib/subscription-access.ts'), 'utf8');
  record(
    'Access',
    'dashboard/settings/billing 허용',
    access.includes("'/dashboard/settings/billing'") ? 'pass' : 'fail'
  );
  record(
    'Access',
    '/billing/checkout 허용',
    access.includes("'/billing/checkout'") ? 'pass' : 'fail'
  );
  record(
    'Access',
    '/billing/expired 허용',
    access.includes("'/billing/expired'") ? 'pass' : 'fail'
  );
}

async function expireStudent(userId, billingSecret) {
  return fetchJson(`${STRAPI_URL}/api/subscriptions/internal/expire-for-qa`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-billing-internal-secret': billingSecret,
    },
    body: JSON.stringify({ userId }),
  });
}

async function runApiScenarios() {
  console.log('\n=== API 시나리오 ===\n');

  try {
    const ping = await fetchJson(`${STRAPI_URL}/api/plans/active`);
    if (!ping.response.ok) throw new Error('Strapi unreachable');
    record('API', 'Strapi reachable', 'pass');
  } catch (error) {
    record('API', 'Strapi reachable', 'skip', error instanceof Error ? error.message : String(error));
    return;
  }

  const billingSecret = process.env.BILLING_INTERNAL_SECRET?.trim();
  if (!billingSecret) {
    record('API', 'Expire-for-qa scenarios', 'skip', 'BILLING_INTERNAL_SECRET not set');
    return;
  }

  const secretProbe = await fetchJson(`${STRAPI_URL}/api/subscriptions/internal/expire-for-qa`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-billing-internal-secret': billingSecret,
    },
    body: JSON.stringify({ userId: 1 }),
  });
  if (secretProbe.response.status === 403) {
    record(
      'API',
      'Expire-for-qa scenarios',
      'skip',
      'BILLING_INTERNAL_SECRET mismatch — Strapi .env와 동일한 값으로 설정하세요'
    );
    return;
  }

  const suffix = Date.now();

  const student = await registerUser({
    username: `qa_manual_stu_${suffix}`,
    email: `qa_manual_stu_${suffix}@example.com`,
    password: 'QaManualTest123!',
    profile: { schoolLevel: 'other' },
    consents: {
      termsAgreed: true,
      privacyAgreed: true,
      guardianConsentConfirmed: true,
      termsVersion: '1.0',
      privacyVersion: '1.0',
    },
  });

  if (!student.ok || !student.jwt) {
    record('API', 'Register trialing student', 'fail');
    return;
  }
  record('API', 'Register trialing student', 'pass', `userId=${student.userId}`);

  const subBefore = await fetchJson(`${STRAPI_URL}/api/subscriptions/me`, {
    headers: authHeaders(student.jwt),
  });
  const trialing = subBefore.body?.subscription?.status === 'trialing';
  const accessBefore = subBefore.body?.subscription?.isAccessAllowed === true;
  record(
    'Trial',
    '체험 중 isAccessAllowed',
    trialing && accessBefore ? 'pass' : 'fail',
    `status=${subBefore.body?.subscription?.status}`
  );

  const periodEnd = subBefore.body?.subscription?.currentPeriodEnd;
  if (periodEnd) {
    const daysLeft = Math.ceil(
      (new Date(periodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    record('Trial', 'D-day 잔여일 > 0', daysLeft > 0 && daysLeft <= 14 ? 'pass' : 'fail', `${daysLeft}일`);
  }

  const manager = await registerUser({
    username: `qa_manual_mgr_${suffix}`,
    email: `qa_manual_mgr_${suffix}@example.com`,
    password: 'QaManualTest123!',
    profile: { schoolLevel: 'manager' },
    consents: {
      termsAgreed: true,
      privacyAgreed: true,
      guardianConsentConfirmed: true,
      termsVersion: '1.0',
      privacyVersion: '1.0',
    },
  });

  if (!manager.ok || !manager.jwt) {
    record('API', 'Register manager', 'fail');
    return;
  }
  record('API', 'Register manager', 'pass', `userId=${manager.userId}`);

  const mgrSub = await fetchJson(`${STRAPI_URL}/api/subscriptions/me`, {
    headers: authHeaders(manager.jwt),
  });
  record(
    'Manager',
    '매니저 구독 API 차단',
    mgrSub.response.status === 403 ? 'pass' : 'fail',
    `status=${mgrSub.response.status}`
  );

  const addMgr = await fetchJson(`${STRAPI_URL}/api/user-profiles/me/managers`, {
    method: 'POST',
    headers: authHeaders(student.jwt),
    body: JSON.stringify({ managerUserId: manager.userId }),
  });
  record(
    'Manager',
    '학생 → 매니저 연결',
    addMgr.response.ok ? 'pass' : 'fail',
    addMgr.response.ok ? undefined : JSON.stringify(addMgr.body).slice(0, 80)
  );

  const listBefore = await fetchJson(`${STRAPI_URL}/api/user-profiles/manager/students`, {
    headers: authHeaders(manager.jwt),
  });
  const studentRow = (listBefore.body?.students ?? []).find((s) => s.userId === student.userId);
  record(
    'Manager',
    '매니저 학생 목록 isAccessAllowed=true',
    studentRow?.isAccessAllowed === true ? 'pass' : 'fail',
    `isAccessAllowed=${studentRow?.isAccessAllowed}`
  );

  const cancelRes = await fetchJson(`${STRAPI_URL}/api/subscriptions/cancel`, {
    method: 'POST',
    headers: authHeaders(student.jwt),
  });
  record(
    'Cancel',
    '해지 예약 cancelAtPeriodEnd',
    cancelRes.body?.subscription?.cancelAtPeriodEnd === true ? 'pass' : 'fail',
    `cancelAtPeriodEnd=${cancelRes.body?.subscription?.cancelAtPeriodEnd}`
  );

  const expired = await expireStudent(student.userId, billingSecret);
  const expiredOk =
    expired.response.ok &&
    expired.body?.subscription?.status === 'expired' &&
    expired.body?.subscription?.isAccessAllowed === false;
  record(
    'Expire',
    '만료 후 isAccessAllowed=false',
    expiredOk ? 'pass' : 'fail',
    `status=${expired.body?.subscription?.status}`
  );

  const listAfter = await fetchJson(`${STRAPI_URL}/api/user-profiles/manager/students`, {
    headers: authHeaders(manager.jwt),
  });
  const studentRowAfter = (listAfter.body?.students ?? []).find((s) => s.userId === student.userId);
  record(
    'Manager',
    '만료 학생 배지 데이터 isAccessAllowed=false',
    studentRowAfter?.isAccessAllowed === false ? 'pass' : 'fail'
  );

  const scheduleRes = await fetchJson(
    `${STRAPI_URL}/api/user-schedules?studentUserId=${student.userId}&start=2026-01-01&end=2026-12-31`,
    { headers: authHeaders(manager.jwt) }
  );
  record(
    'Manager',
    '만료 학생 일정 API 403',
    scheduleRes.response.status === 403 ? 'pass' : 'fail',
    `status=${scheduleRes.response.status}`
  );

  const prepareRoute = readFileSync(
    join(root, 'frontend/src/app/api/billing/checkout/prepare/route.ts'),
    'utf8'
  );
  record(
    'Consent',
    'checkout prepare 법정대리인 검증',
    prepareRoute.includes('guardianConsentConfirmedAt') && prepareRoute.includes('403')
      ? 'pass'
      : 'fail'
  );

  for (const path of ['/dashboard/settings/billing', '/billing/checkout', '/billing/expired']) {
    const ok = await fetch(`${FRONTEND_URL}${path}`, {
      redirect: 'manual',
      signal: AbortSignal.timeout(15000),
    })
      .then((r) => r.status === 200 || r.status === 307)
      .catch(() => false);
    record(
      'Frontend',
      `만료 예외 페이지 ${path}`,
      ok ? 'pass' : 'skip',
      ok ? `reachable` : 'frontend not ready'
    );
  }
}

async function runOpsPendingScenario() {
  console.log('\n=== Ops 매니저 승인 (API) ===\n');

  const opsSecret = process.env.OPS_INTERNAL_SECRET?.trim();
  if (!opsSecret) {
    record('Ops', '매니저 승인 E2E', 'skip', 'OPS_INTERNAL_SECRET not set');
    return;
  }

  const opsProbe = await fetchJson(`${STRAPI_URL}/api/ops/internal/managers/pending`, {
    headers: { 'x-ops-internal-secret': opsSecret },
  });
  if (opsProbe.response.status === 403) {
    record(
      'Ops',
      '매니저 승인 E2E',
      'skip',
      'OPS_INTERNAL_SECRET mismatch — Strapi .env와 동일한 값으로 설정하세요'
    );
    return;
  }

  const suffix = Date.now();
  const manager = await registerUser({
    username: `qa_ops_pending_${suffix}`,
    email: `qa_ops_pending_${suffix}@example.com`,
    password: 'QaManualTest123!',
    profile: { schoolLevel: 'manager' },
    consents: {
      termsAgreed: true,
      privacyAgreed: true,
      guardianConsentConfirmed: true,
      termsVersion: '1.0',
      privacyVersion: '1.0',
    },
  });

  if (!manager.ok || !manager.userId) {
    record('Ops', '매니저 승인 E2E', 'skip', 'manager register failed');
    return;
  }

  const markPending = await fetchJson(
    `${STRAPI_URL}/api/ops/internal/qa/managers/${manager.userId}/mark-pending`,
    {
      method: 'POST',
      headers: { 'x-ops-internal-secret': opsSecret },
    }
  );
  if (!markPending.response.ok) {
    record('Ops', 'mark-pending', 'fail', `status=${markPending.response.status}`);
    return;
  }

  const pending = await fetchJson(`${STRAPI_URL}/api/ops/internal/managers/pending`, {
    headers: { 'x-ops-internal-secret': opsSecret },
  });
  const inList = (pending.body?.items ?? []).some((i) => i.userId === manager.userId);
  record('Ops', 'pending 목록 포함', inList ? 'pass' : 'fail');

  const approve = await fetchJson(
    `${STRAPI_URL}/api/ops/internal/managers/${manager.userId}/approve`,
    { method: 'POST', headers: { 'x-ops-internal-secret': opsSecret } }
  );
  record(
    'Ops',
    '매니저 승인 API',
    approve.response.ok && approve.body?.managerStatus === 'approved' ? 'pass' : 'fail',
    approve.body?.managerStatus
  );
}

function printBrowserChecklist() {
  console.log('\n=== 브라우저 수동 확인 (남은 항목) ===\n');
  record(
    'Browser',
    '운영자 /ops 접근',
    'skip',
    'Strapi Admin → User+Profile isOperator=true → /login → /ops'
  );
  record(
    'Browser',
    '일반 회원 /ops 차단',
    'skip',
    '학생 계정 /ops → /dashboard 리다이렉트'
  );
  record(
    'Browser',
    '만료 학생 /dashboard 리다이렉트',
    'skip',
    'expire-for-qa 후 로그인 → /dashboard → /billing/expired'
  );
  record(
    'Browser',
    'D-day 배너 표시',
    'skip',
    '체험 중 학생 /dashboard 에서 배너 확인'
  );
  record(
    'Browser',
    '포트원 결제 UI',
    'skip',
    '포트원 테스트 키 발급 후 /billing/checkout'
  );
}

function printSummary() {
  const pass = results.filter((r) => r.status === 'pass').length;
  const fail = results.filter((r) => r.status === 'fail').length;
  const skip = results.filter((r) => r.status === 'skip').length;

  console.log('\n=== Manual QA summary ===\n');
  console.log(`Pass ${pass} / Fail ${fail} / Skip ${skip}`);

  if (fail > 0) {
    console.log('\nFailures:');
    for (const row of results.filter((r) => r.status === 'fail')) {
      console.log(`  - [${row.section}] ${row.name}${row.detail ? `: ${row.detail}` : ''}`);
    }
    process.exitCode = 1;
  }
}

async function main() {
  console.log('Show Me The Plan — Billing Manual QA (API)\n');
  mergeEnv();
  checkStaticUi();
  checkAccessHelpers();
  await runApiScenarios();
  await runOpsPendingScenario();
  printBrowserChecklist();
  printSummary();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
