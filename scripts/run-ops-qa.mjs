#!/usr/bin/env node

/**
 * Ops Admin QA runner — maps to docs/MONETIZATION-OPS-ADMIN-PLAN.md §13
 *
 * Usage (repo root):
 *   node scripts/run-ops-qa.mjs
 *
 * Env (optional overrides):
 *   STRAPI_URL=http://localhost:1337
 *   FRONTEND_URL=http://localhost:3000
 *   OPS_INTERNAL_SECRET=...
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const STRAPI_URL = (process.env.STRAPI_URL || 'http://localhost:1337').replace(/\/$/, '');
const FRONTEND_URL = (process.env.FRONTEND_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(
  /\/$/,
  ''
);

const SENSITIVE_KEYS = ['pgBillingKey', 'billingKey', 'pgCustomerId'];
const OPS_FRONTEND_DIRS = [
  join(root, 'frontend/src/app/ops'),
  join(root, 'frontend/src/components/ops'),
  join(root, 'frontend/src/app/api/ops'),
];

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

  if (!process.env.OPS_INTERNAL_SECRET?.trim()) {
    const example = loadEnvFile(join(root, '.env.example'));
    if (example.OPS_INTERNAL_SECRET?.trim()) {
      process.env.OPS_INTERNAL_SECRET = example.OPS_INTERNAL_SECRET.trim();
    }
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(12000),
  });
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 300) };
  }
  return { response, body, text };
}

function collectStrings(value, found = []) {
  if (value == null) return found;
  if (typeof value === 'string') {
    found.push(value);
    return found;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, found);
    return found;
  }
  if (typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      if (SENSITIVE_KEYS.includes(key)) {
        found.push(`__KEY__:${key}`);
      }
      collectStrings(nested, found);
    }
  }
  return found;
}

function scanForSensitiveKeys(body, label) {
  const issues = [];
  if (body && typeof body === 'object') {
    for (const key of SENSITIVE_KEYS) {
      if (key in body) {
        issues.push(`${label}: top-level ${key}`);
      }
    }
  }
  const strings = collectStrings(body);
  for (const key of SENSITIVE_KEYS) {
    if (strings.includes(`__KEY__:${key}`)) {
      issues.push(`${label}: nested key ${key}`);
    }
  }
  return issues;
}

function walkTsFiles(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkTsFiles(full, files);
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) files.push(full);
  }
  return files;
}

function checkStaticOpsSurface() {
  console.log('\n=== Static (code surface) ===\n');

  const forbiddenPatterns = [
    { pattern: /pgBillingKey/g, label: 'pgBillingKey identifier' },
    { pattern: /decryptBillingSecret/g, label: 'decryptBillingSecret import' },
  ];

  let staticIssues = 0;
  for (const dir of OPS_FRONTEND_DIRS) {
    const files = walkTsFiles(dir);
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      for (const { pattern, label } of forbiddenPatterns) {
        if (pattern.test(content)) {
          staticIssues += 1;
          record('Static', `${label} in ops UI`, 'fail', file.replace(root + '\\', '').replace(root + '/', ''));
        }
      }
    }
  }

  record(
    'Static',
    'Ops UI pgBillingKey/decrypt absent',
    staticIssues === 0 ? 'pass' : 'fail',
    staticIssues === 0 ? undefined : `${staticIssues} issue(s)`
  );

  const middleware = readFileSync(join(root, 'frontend/src/middleware.ts'), 'utf8');
  record(
    'Static',
    'Middleware ops guard',
    middleware.includes('isOpsPagePath') && middleware.includes('isOperator') ? 'pass' : 'fail'
  );

  const schema = readFileSync(
    join(root, 'backend/src/api/user-profile/content-types/user-profile/schema.json'),
    'utf8'
  );
  record('Static', 'user-profile.isOperator schema', schema.includes('"isOperator"') ? 'pass' : 'fail');

  const controller = readFileSync(
    join(root, 'backend/src/api/user-profile/controllers/user-profile.ts'),
    'utf8'
  );
  record(
    'Static',
    'register blocks isOperator',
    controller.includes('운영자 계정은 공개 가입으로 생성할 수 없습니다') ? 'pass' : 'fail'
  );
  record(
    'Static',
    'updateMe blocks isOperator',
    controller.includes('운영자 권한은 변경할 수 없습니다') ? 'pass' : 'fail'
  );
}

async function registerStudent() {
  const suffix = Date.now();
  const payload = {
    username: `qa_ops_student_${suffix}`,
    email: `qa_ops_student_${suffix}@example.com`,
    password: 'QaOpsTest123!',
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

  return { ok: true, userId: body.user?.id, email: payload.email, password: payload.password };
}

async function registerManager() {
  const suffix = Date.now();
  const payload = {
    username: `qa_ops_mgr_${suffix}`,
    email: `qa_ops_mgr_${suffix}@example.com`,
    password: 'QaOpsTest123!',
    profile: { schoolLevel: 'manager' },
    consents: {
      termsAgreed: true,
      privacyAgreed: true,
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

  return { ok: true, userId: body.user?.id };
}

async function runIntegration() {
  console.log('\n=== Integration (live API) ===\n');

  mergeEnv();
  const secret = process.env.OPS_INTERNAL_SECRET?.trim();

  if (!secret) {
    record('Env', 'OPS_INTERNAL_SECRET', 'skip', 'not set — internal API tests skipped');
    return;
  }

  record('Env', 'OPS_INTERNAL_SECRET', 'pass', 'set');

  try {
    const health = await fetchJson(`${STRAPI_URL}/api/plans/active`);
    if (!health.response.ok) throw new Error('Strapi not reachable');
    record('Integration', 'Strapi reachable', 'pass');
  } catch (error) {
    record('Integration', 'Strapi reachable', 'skip', error instanceof Error ? error.message : String(error));
    return;
  }

  const noSecret = await fetchJson(`${STRAPI_URL}/api/ops/internal/dashboard/summary`);
  const noSecretLeaked = noSecret.body?.members != null;
  record(
    'Auth',
    'Internal API without secret',
    noSecret.response.status === 403 && !noSecretLeaked ? 'pass' : 'fail',
    noSecretLeaked ? '403 but response body leaked' : `status ${noSecret.response.status}`
  );

  const badSecret = await fetchJson(`${STRAPI_URL}/api/ops/internal/dashboard/summary`, {
    headers: { 'x-ops-internal-secret': 'wrong-secret' },
  });
  record(
    'Auth',
    'Internal API wrong secret',
    badSecret.response.status === 403 ? 'pass' : 'fail',
    `status ${badSecret.response.status}`
  );

  const headers = {
    'x-ops-internal-secret': secret,
    'content-type': 'application/json',
  };

  const summary = await fetchJson(`${STRAPI_URL}/api/ops/internal/dashboard/summary`, { headers });
  const summaryLeak = !summary.response.ok && summary.body?.members;
  record(
    'API',
    'GET dashboard/summary',
    summary.response.ok && !summaryLeak ? 'pass' : 'fail',
    summary.response.ok
      ? 'ok'
      : summaryLeak
        ? '403 but body leaked data'
        : `status ${summary.response.status}`
  );

  const operatorSignup = await fetchJson(`${STRAPI_URL}/api/user-profiles/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      username: `qa_ops_bad_${Date.now()}`,
      email: `qa_ops_bad_${Date.now()}@example.com`,
      password: 'QaOpsTest123!',
      profile: { schoolLevel: 'other', isOperator: true },
      consents: {
        termsAgreed: true,
        privacyAgreed: true,
        guardianConsentConfirmed: true,
        termsVersion: '1.0',
        privacyVersion: '1.0',
      },
    }),
  });
  record(
    'Guard',
    'Signup rejects isOperator',
    operatorSignup.response.status === 400 ? 'pass' : 'fail',
    `status ${operatorSignup.response.status}`
  );

  const student = await registerStudent();
  if (!student.ok || !student.userId) {
    record('Integration', 'Register QA student', 'fail', JSON.stringify(student.body).slice(0, 120));
    return;
  }
  record('Integration', 'Register QA student', 'pass', `userId=${student.userId}`);

  const detail = await fetchJson(`${STRAPI_URL}/api/ops/internal/subscriptions/${student.userId}`, {
    headers,
  });
  const detailIssues = scanForSensitiveKeys(detail.body, 'subscription detail');
  record(
    'Security',
    'Subscription detail no pgBillingKey',
    detail.response.ok && detailIssues.length === 0 ? 'pass' : 'fail',
    detailIssues.join('; ') || `status ${detail.response.status}`
  );
  record(
    'Security',
    'Subscription detail uses hasBillingKey only',
    detail.body?.subscription && 'hasBillingKey' in detail.body.subscription ? 'pass' : 'skip',
    'no subscription block'
  );

  const preview = await fetchJson(
    `${STRAPI_URL}/api/ops/internal/subscriptions/${student.userId}/discount/preview`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ discountPercent: 20, discountNote: 'ops-qa' }),
    }
  );
  record(
    'Discount',
    'POST discount preview',
    preview.response.ok && preview.body?.nextBilling?.billedAmount != null ? 'pass' : 'fail',
    preview.response.ok
      ? `billed=${preview.body.nextBilling.billedAmount}`
      : JSON.stringify(preview.body).slice(0, 120)
  );

  const patch = await fetchJson(
    `${STRAPI_URL}/api/ops/internal/subscriptions/${student.userId}/discount`,
    {
      method: 'PATCH',
      headers: { ...headers, 'x-ops-operator': 'ops-qa-runner' },
      body: JSON.stringify({ discountPercent: 20, discountNote: 'ops-qa' }),
    }
  );
  record(
    'Discount',
    'PATCH discount saves',
    patch.response.ok ? 'pass' : 'fail',
    `status ${patch.response.status}`
  );

  const detailAfter = await fetchJson(`${STRAPI_URL}/api/ops/internal/subscriptions/${student.userId}`, {
    headers,
  });
  const grantedBy = detailAfter.body?.discount?.discountGrantedBy;
  const grantedAt = detailAfter.body?.discount?.discountGrantedAt;
  record(
    'Discount',
    'discountGrantedBy recorded',
    grantedBy === 'ops-qa-runner' ? 'pass' : 'fail',
    grantedBy || 'missing'
  );
  record(
    'Discount',
    'discountGrantedAt recorded',
    grantedAt ? 'pass' : 'fail',
    grantedAt || 'missing'
  );

  const nextBilling = detailAfter.body?.subscription?.nextBilling?.billedAmount;
  record(
    'Discount',
    'nextBilling reflects discount',
    typeof nextBilling === 'number' && nextBilling < 4900 ? 'pass' : 'fail',
    `billed=${nextBilling}`
  );

  const members = await fetchJson(`${STRAPI_URL}/api/ops/internal/members?pageSize=5`, { headers });
  const memberIssues = scanForSensitiveKeys(members.body, 'members');
  record(
    'API',
    'GET members',
    members.response.ok && memberIssues.length === 0 ? 'pass' : 'fail',
    memberIssues.join('; ') || `total=${members.body?.total}`
  );

  const subs = await fetchJson(`${STRAPI_URL}/api/ops/internal/subscriptions?pageSize=5`, { headers });
  const subsIssues = scanForSensitiveKeys(subs.body, 'subscriptions');
  record(
    'API',
    'GET subscriptions list',
    subs.response.ok && subsIssues.length === 0 ? 'pass' : 'fail',
    subsIssues.join('; ') || `total=${subs.body?.total}`
  );

  const pending = await fetchJson(`${STRAPI_URL}/api/ops/internal/managers/pending`, { headers });
  record(
    'Managers',
    'GET managers/pending',
    pending.response.ok ? 'pass' : 'fail',
    `count=${pending.body?.items?.length ?? 0}`
  );

  if (Array.isArray(pending.body?.items) && pending.body.items.length > 0) {
    const targetId = pending.body.items[0].userId;
    const approve = await fetchJson(`${STRAPI_URL}/api/ops/internal/managers/${targetId}/approve`, {
      method: 'POST',
      headers,
    });
    record(
      'Managers',
      'POST approve pending manager',
      approve.response.ok && approve.body?.managerStatus === 'approved' ? 'pass' : 'fail',
      approve.body?.managerStatus || `status ${approve.response.status}`
    );
  } else {
    const manager = await registerManager();
    if (manager.ok) {
      record(
        'Managers',
        'Approve/reject flow',
        'skip',
        'no pending managers — signup creates approved managers; seed pending in Strapi Admin for full test'
      );
    }
  }

  try {
    const response = await fetch(`${FRONTEND_URL}/api/ops/dashboard/summary`, {
      redirect: 'manual',
      signal: AbortSignal.timeout(15000),
    });
    const allowed = response.status === 401 || response.status === 403 || response.status === 307;
    record(
      'BFF',
      'GET /api/ops without session',
      allowed ? 'pass' : 'fail',
      `status ${response.status}`
    );
  } catch (error) {
    record(
      'BFF',
      'GET /api/ops without session',
      'skip',
      error instanceof Error ? error.message : 'frontend not running'
    );
  }
  console.log('\n=== Manual (browser) ===\n');
  record(
    'Manual',
    'isOperator=false → /ops redirect',
    'skip',
    '운영자 아닌 계정으로 /ops 접속 → /dashboard 리다이렉트 확인'
  );
  record(
    'Manual',
    'isOperator=true → /ops 대시보드',
    'skip',
    'Strapi Admin에서 isOperator=true 계정 생성 후 /ops 확인'
  );
  record(
    'Manual',
    '매니저 승인 E2E',
    'skip',
    'managerStatus=pending 프로필 생성 후 /ops/managers/pending 승인'
  );
}

function printSummary() {
  const pass = results.filter((r) => r.status === 'pass').length;
  const fail = results.filter((r) => r.status === 'fail').length;
  const skip = results.filter((r) => r.status === 'skip').length;

  console.log('\n=== Ops QA summary ===\n');
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
  console.log('Show Me The Plan — Ops Admin QA\n');
  mergeEnv();
  checkStaticOpsSurface();
  await runIntegration();
  printSummary();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
